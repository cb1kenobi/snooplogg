import type { Writable } from 'node:stream';
import { format, inspect } from 'node:util';
import ansiStyles from 'ansi-styles';
import { isJSON } from './is-json.js';
import { NanoBuffer } from './nanobuffer.js';
import { nsToRgb } from './ns-to-rgb.js';
import type {
	FormatLogElements,
	LogElements,
	LogFormatter,
	LogMessage,
	RawLogMessage,
	SnoopLoggConfig,
	StyleHelpers
} from './types.js';

/**
 * Describes the various log methods such as `info()`, `warn()`, etc.
 *
 * We have to export this type so that we can destructure and export the log
 * methods in the index.ts file.
 */
export type LogMethod = (...args: unknown[]) => Logger;

/**
 * Regular expression to match a stack frame in a stack trace.
 * Tested with Node.js and Bun stack traces.
 */
const stackFrameRE = /^\s*at (.* )?(\(?.+\)?)$/;

/**
 * Default log element formatters.
 */
export const defaultElements: FormatLogElements = {
	/**
	 * Formats an error message.
	 * @param err An error object.
	 * @param styles The ansi-styles module plus the nsToRgb function.
	 * @returns The formatted error message.
	 */
	error(err: Error, styles: StyleHelpers) {
		const message = `${styles.redBright.open}${err.toString()}${styles.redBright.close}`;
		let stack = '';
		if (err.stack) {
			stack = err.stack
				.split('\n')
				.slice(1)
				.map((line, i, lines) => {
					const m = line.match(stackFrameRE);
					let result = `${styles.gray.open}${i + 1 < lines.length ? '├' : '└'}─ ${m ? '' : line.trim()}${styles.gray.close}`;
					if (m) {
						const [_, method, location] = m;
						const stlyedMethod = method
							? `${styles.whiteBright.open}${styles.italic.open}${method}${styles.italic.close}${styles.whiteBright.close}`
							: '';
						result += `${stlyedMethod}${styles.white.open}${location}${styles.white.close}`;
					}
					return result;
				})
				.join('\n');
		}
		return stack ? `${message}\n${stack}` : message;
	},

	/**
	 * Formats a log message line. This is called for each line in a multi-line
	 * log message.
	 * @param msg The log message line.
	 * @param method The log method name.
	 * @param styles The ansi-styles module plus the nsToRgb function.
	 * @returns The formatted log message line.
	 */
	message(msg: string, method: string, styles: StyleHelpers) {
		if (method === 'trace') {
			return `${styles.white.open}${msg}${styles.white.close}`;
		}
		return msg;
	},

	/**
	 * Formats the log method name.
	 * @param name The log method name.
	 * @param styles The ansi-styles module plus the nsToRgb function.
	 * @returns The formatted log method name.
	 */
	method(name: string, styles: StyleHelpers) {
		const formattedName = name.toUpperCase().padEnd(5);
		switch (name) {
			case 'debug':
				return `${styles.magenta.open}${formattedName}${styles.magenta.close}`;
			case 'info':
				return `${styles.green.open}${formattedName}${styles.green.close}`;
			case 'warn':
				return `${styles.yellow.open}${formattedName}${styles.yellow.close}`;
			case 'error':
				return `${styles.redBright.open}${formattedName}${styles.redBright.close}`;
			case 'panic':
				return `${styles.bgRed.open}${styles.white.open}${formattedName}${styles.white.close}${styles.bgRed.close}`;
			default: // trace
				return `${styles.gray.open}${formattedName}${styles.gray.close}`;
		}
	},

	/**
	 * Formats the log message's namespace.
	 * @param ns The logger namespace.
	 * @param styles The ansi-styles module plus the nsToRgb function.
	 * @returns The formatted logger namespace.
	 */
	namespace(ns: string, styles: StyleHelpers) {
		const { r, g, b } = nsToRgb(ns);
		return `${styles.color.ansi256(
			styles.rgbToAnsi256(r, g, b)
		)}${ns}${styles.color.close}`;
	},

	/**
	 * Formats the log message's timestamp. This can be used by a custom formatter.
	 * @param ts The timestamp.
	 * @param styles The ansi-styles module plus the nsToRgb function.
	 * @returns The formatted timestamp.
	 */
	timestamp(ts: Date, styles: StyleHelpers) {
		return `${styles.gray.open}${ts.toISOString().replace('T', ' ').replace('Z', '')}${styles.gray.close}`;
	},

	/**
	 * Formats the time the message was logged since the start of the process.
	 * @param uptime The process uptime.
	 * @param styles The ansi-styles module plus the nsToRgb function.
	 * @returns The formatted process uptime.
	 */
	uptime(uptime: number, styles: StyleHelpers) {
		return `${styles.gray.open}${uptime.toFixed(3).padStart(8)}s${styles.gray.close}`;
	}
};

/**
 * The secret sauce.
 */
class Functionator extends Function {
	/**
	 * Initializes the base function used to create new namespaced child
	 * logger instances.
	 * @param fn A function that creates a child logger instance.
	 * @returns A function with the instantiated class's prototype.
	 */
	constructor(fn: (namespace: string) => Logger) {
		super();
		return Object.setPrototypeOf(fn, new.target.prototype);
	}
}

/**
 * The logger represents a namespace and can have a single parent and multiple
 * child namespaces.
 */
class Logger extends Functionator {
	_log: LogMethod | undefined;
	_trace: LogMethod | undefined;
	_debug: LogMethod | undefined;
	_info: LogMethod | undefined;
	_warn: LogMethod | undefined;
	_error: LogMethod | undefined;
	_panic: LogMethod | undefined;
	ns: string;
	nsPath: string[];
	root: SnoopLogg;
	subnamespaces: Record<string, Logger> = {};

	/**
	 * Initializes a new logger instance by combining the parent namespace with
	 * this logger's namespace.
	 * @param root The root SnoogLogg instance.
	 * @param parent The parent logger instance used to construct the namespace.
	 * @param namespace The namespace of the logger.
	 */
	constructor(
		root: SnoopLogg,
		parent: Logger | null = null,
		namespace?: string
	) {
		super((namespace: string) => this.initChild(namespace));

		this.nsPath = [];
		this.root = root;

		if (namespace !== undefined) {
			if (!namespace || typeof namespace !== 'string') {
				throw new TypeError('Expected namespace to be a string');
			}
			if (/[\s,]+/.test(namespace)) {
				throw new Error('Namespace cannot contain spaces or commas');
			}

			this.nsPath = parent ? [...parent.nsPath, namespace] : [namespace];
		}

		this.ns = this.nsPath.join(':');
	}

	/**
	 * Helper function to create a new child logger instance.
	 * @param namespace The namespace of the child logger.
	 * @returns A new child logger instance.
	 */
	initChild(namespace: string) {
		if (!this.subnamespaces[namespace]) {
			this.subnamespaces[namespace] = new Logger(this.root, this, namespace);
		}
		return this.subnamespaces[namespace];
	}

	/**
	 * Lazy initializes a new log method.
	 * @param method The log method name.
	 * @returns A new log method.
	 */
	initMethod(method: string) {
		return (...args: unknown[]) => {
			this.root.dispatch({
				args,
				method,
				ns: this.ns,
				ts: new Date(),
				uptime: process.uptime()
			});
			return this;
		};
	}

	/**
	 * Logs a message without a log method.
	 * @param args The log message arguments.
	 * @returns The logger instance.
	 */
	get log() {
		if (!this._log) {
			this._log = this.initMethod('log');
		}
		return this._log;
	}

	get trace() {
		if (!this._trace) {
			this._trace = this.initMethod('trace');
		}
		return this._trace;
	}

	get debug() {
		if (!this._debug) {
			this._debug = this.initMethod('debug');
		}
		return this._debug;
	}

	get info() {
		if (!this._info) {
			this._info = this.initMethod('info');
		}
		return this._info;
	}

	get warn() {
		if (!this._warn) {
			this._warn = this.initMethod('warn');
		}
		return this._warn;
	}

	get error() {
		if (!this._error) {
			this._error = this.initMethod('error');
		}
		return this._error;
	}

	get panic() {
		if (!this._panic) {
			this._panic = this.initMethod('panic');
		}
		return this._panic;
	}
}

/**
 * The public API for the SnoopLogg logger.
 */
export class SnoopLogg extends Functionator {
	allow: string | RegExp | null = null;
	elements: LogElements = {};
	format?: LogFormatter | null;
	history: NanoBuffer<RawLogMessage> = new NanoBuffer();
	id = Math.round(Math.random() * 1e9);
	ignore: RegExp | null = null;
	onSnoopMessage: ((msg: RawLogMessage) => void) | null = null;
	logger: Logger;
	streams = new Map<Writable, () => void>();

	constructor(conf?: SnoopLoggConfig) {
		super((namespace: string) => this.logger.initChild(namespace));
		this.logger = new Logger(this);
		if (conf) {
			this.config(conf);
		}
	}

	config(conf: SnoopLoggConfig = {}) {
		if (typeof conf !== 'object') {
			throw new TypeError('Expected logger options to be an object');
		}

		if (conf.format && typeof conf.format !== 'function') {
			throw new TypeError('Expected format to be a function');
		}
		this.format = conf.format;

		if (conf.elements !== undefined) {
			if (typeof conf.elements !== 'object') {
				throw new TypeError('Expected elements to be an object');
			}
			if (conf.elements) {
				for (const [type, fn] of Object.entries(conf.elements)) {
					if (defaultElements[type] && typeof fn !== 'function') {
						throw new TypeError(`Expected "${type}" elements to be a function`);
					}
				}
			}
			this.elements = conf.elements;
		}

		if (conf.historySize !== undefined) {
			try {
				this.history.maxSize = conf.historySize;
			} catch (err: unknown) {
				if (err instanceof Error) {
					err.message = `Invalid history size: ${err.message}`;
					err.stack = `${err.toString()}${err.stack?.substring(err.stack.indexOf('\n')) || ''}`;
				}
				throw err;
			}
		}

		return this;
	}

	applyFormat(msg: RawLogMessage) {
		const { args, elements, format, method, ns, ts, uptime } = msg;
		const formatter = format || defaultFormatter;
		return formatter(
			{
				args,
				method,
				ns,
				elements: {
					...defaultElements,
					...elements
				},
				ts,
				uptime
			},
			Object.defineProperties(
				{
					...ansiStyles,
					nsToRgb
				},
				Object.getOwnPropertyDescriptors(ansiStyles)
			)
		);
	}

	dispatch({
		args,
		id = this.id,
		method,
		ns,
		ts,
		uptime
	}: {
		args: unknown[];
		id?: number;
		method: string;
		ns: string;
		ts: Date;
		uptime: number;
	}) {
		const msg: RawLogMessage = {
			args,
			elements: this.elements,
			format: this.format,
			id,
			method,
			ns,
			ts,
			uptime
		};

		this.history.push(msg);

		if (this.isEnabled(ns)) {
			for (const stream of this.streams.keys()) {
				stream.write(
					stream.writableObjectMode ? msg : `${this.applyFormat(msg)}\n`
				);
			}
		}

		if (id === this.id) {
			globalThis.snooplogg.emit('message', msg);
		}
	}

	enable(pattern: string | RegExp = '') {
		if (typeof pattern !== 'string' && !(pattern instanceof RegExp)) {
			throw new TypeError('Expected pattern to be a string or regex');
		}

		let allow: string | RegExp | null = null;
		let ignore: RegExp | null = null;

		if (pattern === '*' || pattern instanceof RegExp) {
			allow = pattern;
		} else if (pattern && typeof pattern === 'string') {
			const allows: string[] = [];
			const ignores: string[] = [];

			for (let p of pattern.split(/[\s,]+/)) {
				if (p) {
					p = p.replaceAll('*', '.*?');
					if (p[0] === '-') {
						ignores.push(p.slice(1));
					} else {
						allows.push(p);
					}
				}
			}

			allow = new RegExp(`^(${allows.join('|')})(:.+|$)`);

			if (ignores.length) {
				ignore = new RegExp(`^(${ignores.join('|')})$`);
			}
		}

		this.allow = allow;
		this.ignore = ignore;

		return this;
	}

	isEnabled(namespace: string) {
		const allow = this.allow;
		if (allow === null) {
			// all logging is silenced
			return false;
		}

		if (!namespace || allow === '*') {
			// nothing to filter
			return true;
		}

		if (
			allow instanceof RegExp &&
			allow.test(namespace) &&
			(!this.ignore || !this.ignore.test(namespace))
		) {
			return true;
		}

		return false;
	}

	pipe(stream: Writable, opts: { flush?: boolean } = {}) {
		if (!stream || typeof stream.write !== 'function') {
			throw new TypeError('Invalid stream');
		}

		if (this.streams.has(stream)) {
			return this;
		}

		const onEnd = () => this.streams.delete(stream);
		this.streams.set(stream, onEnd);
		stream.on('end', onEnd);

		if (opts.flush) {
			for (const msg of this.history) {
				if (msg && this.isEnabled(msg.ns)) {
					for (const stream of this.streams.keys()) {
						stream.write(
							stream.writableObjectMode ? msg : `${this.applyFormat(msg)}\n`
						);
					}
				}
			}
		}

		return this;
	}

	unpipe(stream: Writable) {
		if (!stream || typeof stream.write !== 'function') {
			throw new TypeError('Invalid stream');
		}

		const onEnd = this.streams.get(stream);
		if (onEnd) {
			stream.removeListener('end', onEnd);
			this.streams.delete(stream);
		}
	}

	snoop(nsPrefix?: string) {
		if (nsPrefix !== undefined && typeof nsPrefix !== 'string') {
			throw new TypeError('Expected namespace prefix to be a string');
		}

		this.unsnoop();

		this.onSnoopMessage = (msg: RawLogMessage) => {
			if (msg && typeof msg === 'object' && msg.id !== this.id) {
				this.dispatch(
					nsPrefix
						? {
								...msg,
								ns: `${nsPrefix}${msg.ns || ''}`
							}
						: msg
				);
			}
		};

		globalThis.snooplogg.on('message', this.onSnoopMessage);

		return this;
	}

	unsnoop() {
		if (this.onSnoopMessage) {
			globalThis.snooplogg.off('message', this.onSnoopMessage);
			this.onSnoopMessage = null;
		}
		return this;
	}

	get log() {
		return this.logger.log;
	}

	get trace() {
		return this.logger.trace;
	}

	get debug() {
		return this.logger.debug;
	}

	get info() {
		return this.logger.info;
	}

	get warn() {
		return this.logger.warn;
	}

	get error() {
		return this.logger.error;
	}

	get panic() {
		return this.logger.panic;
	}
}

/**
 * Formats each log message in the format "<uptime> <namespace> <method> <msg>".
 *
 * This is the default formatter used by SnoopLogg, but can be overridden by
 * passing a custom formatter function to the SnoopLogg constructor or the
 * config method.
 *
 * @param params.args - The raw arguments passed to the log method.
 * @param params.elements - The log formatting elements.
 * @param params.method - The log method name.
 * @param params.ns - The namespace of the logger.
 * @param params.uptime - The uptime of the process.
 * @param styles - The ansi-styles module plus the nsToRgb function.
 */
export function defaultFormatter(
	{ args, elements, method, ns, uptime }: LogMessage,
	styles: StyleHelpers
) {
	const prefix = `${elements.uptime(uptime, styles)} ${
		ns ? `${elements.namespace(ns, styles)} ` : ''
	}${method && method !== 'log' ? `${elements.method(method, styles)} ` : ''}`;

	const formattedArgs = args.map(it =>
		isJSON(it)
			? inspect(it, {
					breakLength: 0,
					colors: true,
					depth: 4,
					showHidden: false
				})
			: it
	);

	for (let i = 0, len = formattedArgs.length; i < len; i++) {
		const arg = formattedArgs[i];
		if (arg instanceof Error) {
			formattedArgs[i] = elements.error(arg, styles);
		}
	}

	return format(...formattedArgs)
		.split('\n')
		.map(s => prefix + elements.message(s, method, styles))
		.join('\n');
}
