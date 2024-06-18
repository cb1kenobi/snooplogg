import type { Writable } from 'node:stream';
import { format, inspect } from 'node:util';
import ansiStyles from 'ansi-styles';
import { NanoBuffer } from './nanobuffer.js';
import { nsToRgb } from './ns-to-rgb.js';
import type {
	FormatLogElements,
	LogElements,
	LogFormatter,
	LogMessage,
	LoggerConfig,
	RawLogMessage,
	SnoopLoggConfig,
	SnoopLoggStreamMeta,
	StyleHelpers
} from './types.js';

/**
 * TODO:
 * - [ ] Add JSDoc comments
 * - [ ] Finish demo (snoop, nested logger styles)
 * - [ ] Update readme
 * - [ ] Test Bun
 */

export type LogMethod = (...args: unknown[]) => Logger;

const stackFrameRE = /^\s*at (.* )?(\(?.+\)?)$/;

const defaultElements: FormatLogElements = {
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
	message(msg: string, method: string, styles: StyleHelpers) {
		if (method === 'trace') {
			return `${styles.white.open}${msg}${styles.white.close}`;
		}
		return msg;
	},
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
	namespace(ns: string, styles: StyleHelpers) {
		const { r, g, b } = nsToRgb(ns);
		return `${styles.color.ansi256(
			styles.rgbToAnsi256(r, g, b)
		)}${ns}${styles.color.close}`;
	},
	timestamp(ts: Date, styles: StyleHelpers) {
		return `${styles.gray.open}${ts.toISOString().replace('T', ' ').replace('Z', '')}${styles.gray.close}`;
	},
	uptime(uptime: number, styles: StyleHelpers) {
		return `${styles.gray.open}${uptime.toFixed(3).padStart(8)}s${styles.gray.close}`;
	}
};

/**
 * The secret sauce.
 */
class Functionator extends Function {
	constructor(fn: (string) => Logger) {
		super();
		return Object.setPrototypeOf(fn, new.target.prototype);
	}
}

type LoggerOptions = {
	namespace?: string;
	parent: Logger;
	root?: SnoopLogg;
};

export class Logger extends Functionator {
	format?: LogFormatter | null;
	id = Math.round(Math.random() * 1e9);
	logMethods: Record<string, LogMethod> = {};
	ns: string;
	nsPath: string[];
	parent: Logger | null = null;
	root: SnoopLogg | undefined;
	elements: LogElements = {};
	subnamespaces: Record<string, Logger> = {};

	constructor(opts?: LoggerOptions) {
		super((namespace: string) => {
			if (this.root && !this.subnamespaces[namespace]) {
				this.subnamespaces[namespace] = Object.setPrototypeOf(
					new Logger({
						namespace,
						parent: this,
						root: this.root
					}),
					this.root.proto
				);
			}
			return this.subnamespaces[namespace];
		});

		this.nsPath = [];

		if (opts !== undefined) {
			const { namespace, parent, root } = opts;

			if (!namespace || typeof namespace !== 'string') {
				throw new TypeError('Expected namespace to be a string');
			}
			if (/[\s,]+/.test(namespace)) {
				throw new Error('Namespace cannot contain spaces or commas');
			}

			this.nsPath = [...parent.nsPath, namespace];
			this.parent = parent;
			this.root = root;
		}

		this.ns = this.nsPath.join(':');
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

	config(conf: LoggerConfig) {
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
	}

	dispatch({
		args,
		id,
		method,
		ns
	}: { args: unknown[]; id: number; method: string; ns: string }) {
		const msg: RawLogMessage = {
			args,
			format: this.format,
			id,
			method,
			ns,
			elements: this.elements,
			ts: new Date(),
			uptime: process.uptime()
		};

		if (this.root) {
			this.root.history.push(msg);

			if (
				(id === this.root.id && this.enabled) ||
				(id !== this.root.id && this.root.isEnabled(ns))
			) {
				for (const stream of this.root.streams.keys()) {
					stream.write(
						stream.writableObjectMode ? msg : `${this.applyFormat(msg)}\n`
					);
				}
			}
		}

		if (msg.id === this.id) {
			globalThis.snooplogg.emit('message', msg);
		}
	}

	get enabled() {
		return this.root?.isEnabled(this.ns) || false;
	}

	initMethod(method: string) {
		return (...args: unknown[]) => {
			if (this.root) {
				this.dispatch({
					args,
					id: this.root.id,
					method,
					ns: this.ns
				});
			}
			return this;
		};
	}

	get log() {
		if (!this.logMethods.log) {
			this.logMethods.log = this.initMethod('log');
		}
		return this.logMethods.log;
	}

	get trace() {
		if (!this.logMethods.trace) {
			this.logMethods.trace = this.initMethod('trace');
		}
		return this.logMethods.trace;
	}

	get debug() {
		if (!this.logMethods.debug) {
			this.logMethods.debug = this.initMethod('debug');
		}
		return this.logMethods.debug;
	}

	get info() {
		if (!this.logMethods.info) {
			this.logMethods.info = this.initMethod('info');
		}
		return this.logMethods.info;
	}

	get warn() {
		if (!this.logMethods.warn) {
			this.logMethods.warn = this.initMethod('warn');
		}
		return this.logMethods.warn;
	}

	get error() {
		if (!this.logMethods.error) {
			this.logMethods.error = this.initMethod('error');
		}
		return this.logMethods.error;
	}

	get panic() {
		if (!this.logMethods.panic) {
			this.logMethods.panic = this.initMethod('panic');
		}
		return this.logMethods.panic;
	}
}

export class SnoopLogg extends Logger {
	allow: string | RegExp | null = null;
	history: NanoBuffer<RawLogMessage> = new NanoBuffer();
	ignore: RegExp | null = null;
	onSnoopMessage: ((msg: RawLogMessage) => void) | null = null;
	proto: SnoopLogg;
	streams = new Map<Writable, SnoopLoggStreamMeta>();

	constructor(conf?: SnoopLoggConfig) {
		super();
		this.root = this;

		const proto: SnoopLogg = Object.create(Functionator, {
			...Object.getOwnPropertyDescriptors(Logger.prototype),
			protoId: {
				enumerable: false,
				value: this.id
			}
		});
		this.proto = Object.setPrototypeOf(
			this,
			Object.create(
				proto,
				Object.getOwnPropertyDescriptors(SnoopLogg.prototype)
			)
		);

		if (conf) {
			this.config(conf);
		}
	}

	config(conf: SnoopLoggConfig = {}) {
		super.config(conf);

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
		this.streams.set(stream, { onEnd });
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

		const meta = this.streams.get(stream);
		if (meta) {
			stream.removeListener('end', meta.onEnd);
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
}

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

function isJSON(it: unknown): boolean {
	if (it === null || typeof it !== 'object') {
		return false;
	}
	const proto = Object.getPrototypeOf(it);
	return proto?.constructor.name === 'Object';
}
