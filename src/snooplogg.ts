import { Writable } from 'node:stream';
import { format, inspect } from 'node:util';
import ansiStyles from 'ansi-styles';
import { NanoBuffer } from './nanobuffer.js';
import { nsToRgb } from './ns-to-rgb.js';
import type {
	FormatLogStyles,
	LogFormatter,
	LogMessage,
	LogStyles,
	LoggerOptions,
	RawLogMessage,
	SnoopLoggOptions,
	SnoopLoggStreamMeta
} from './types.js';

/**
 * TODO:
 * - [ ] Add JSDoc comments
 * - [ ] Finish demo (snoop, nested logger styles)
 * - [ ] Add tests
 * - [ ] Fix pipe()
 * - [ ] Update readme
 */

export type LogMethod = (...args: unknown[]) => Logger;

const defaultStyles: FormatLogStyles = {
	method(name: string) {
		const formattedName = name.toUpperCase().padEnd(5);
		switch (name) {
			case 'trace':
				return `${ansiStyles.gray.open}${formattedName}${ansiStyles.gray.close}`;
			case 'debug':
				return `${ansiStyles.magenta.open}${formattedName}${ansiStyles.magenta.close}`;
			case 'info':
				return `${ansiStyles.red.open}${formattedName}${ansiStyles.red.close}`;
			case 'warn':
				return `${ansiStyles.yellow.open}${formattedName}${ansiStyles.yellow.close}`;
			case 'error':
				return `${ansiStyles.red.open}${formattedName}${ansiStyles.red.close}`;
			case 'panic':
				return `${ansiStyles.bgRed.open}${ansiStyles.white.open}${formattedName}${ansiStyles.white.close}${ansiStyles.bgRed.close}`;
			default:
				return formattedName;
		}
	},
	namespace(ns: string) {
		const { r, g, b } = nsToRgb(ns);
		return `${ansiStyles.color.ansi256(
			ansiStyles.rgbToAnsi256(r, g, b)
		)}${ns}${ansiStyles.color.close}`;
	},
	timestamp(ts: Date) {
		return `${ansiStyles.gray.open}${ts.toISOString().replace('T', ' ').replace('Z', '')}${ansiStyles.gray.close}`;
	},
	message(msg: string, method: string) {
		return msg;
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

class Logger extends Functionator {
	format?: LogFormatter | null;
	id = Math.round(Math.random() * 1e9);
	logMethods: Record<string, LogMethod> = {};
	ns: string;
	nsPath: string[];
	parent: Logger | null;
	root: SnoopLogg | undefined;
	style: LogStyles = {};
	subnamespaces: Record<string, Logger> = {};

	constructor(
		namespace?: string,
		parent: Logger | null = null,
		root?: SnoopLogg
	) {
		if (namespace !== undefined) {
			if (typeof namespace !== 'string') {
				throw new TypeError('Expected namespace to be a string');
			}
			if (/[\s,]+/.test(namespace)) {
				throw new Error('Namespace cannot contain spaces or commas');
			}
		}

		super((namespace: string) => {
			if (this.root && !this.subnamespaces[namespace]) {
				// TODO: do we need to bind??
				this.subnamespaces[namespace] = Object.setPrototypeOf(
					new Logger(namespace, this, this.root),
					this.root.proto
				);
			}
			return this.subnamespaces[namespace];
		});

		this.nsPath = !namespace
			? []
			: parent
				? [...parent.nsPath, namespace]
				: [namespace];
		this.ns = this.nsPath.join(':');
		this.parent = parent;
		this.root = root;
	}

	applyFormat(msg: RawLogMessage) {
		const { args, format, id, method, ns, style, ts } = msg;
		const formatter = format || defaultFormatter;
		return formatter({
			args,
			method,
			ns,
			style: {
				...defaultStyles,
				...style
			},
			ts
		});
	}

	config(opts: LoggerOptions) {
		if (typeof opts !== 'object') {
			throw new TypeError('Expected logger options to be an object');
		}

		if (opts.format && typeof opts.format !== 'function') {
			throw new TypeError('Expected format to be a function');
		}
		this.format = opts.format;

		if (opts.style !== undefined) {
			if (typeof opts.style !== 'object') {
				throw new TypeError('Expected style to be an object');
			}
			this.style = opts.style;
		}
	}

	dispatch({
		args,
		id,
		method,
		ns
	}: { args: unknown[]; id: number; method: string; ns: string }) {
		if (!this.root) {
			return;
		}

		const msg: RawLogMessage = {
			args,
			format: this.format,
			id,
			method,
			ns,
			style: this.style,
			ts: new Date()
		};

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

		if (msg.id === this.id) {
			globalThis.snooplogg.emit('message', msg);
		}
	}

	get enabled() {
		return this.root?.isEnabled(this.ns) || false;
	}

	initMethod(method: string, props) {
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
			this.logMethods.log = this.initMethod('log', {});
		}
		return this.logMethods.log;
	}

	get trace() {
		if (!this.logMethods.trace) {
			this.logMethods.trace = this.initMethod('trace', {});
		}
		return this.logMethods.trace;
	}

	get debug() {
		if (!this.logMethods.debug) {
			this.logMethods.debug = this.initMethod('debug', {});
		}
		return this.logMethods.debug;
	}

	get info() {
		if (!this.logMethods.info) {
			this.logMethods.info = this.initMethod('info', {});
		}
		return this.logMethods.info;
	}

	get warn() {
		if (!this.logMethods.warn) {
			this.logMethods.warn = this.initMethod('warn', {});
		}
		return this.logMethods.warn;
	}

	get error() {
		if (!this.logMethods.error) {
			this.logMethods.error = this.initMethod('error', {});
		}
		return this.logMethods.error;
	}

	get panic() {
		if (!this.logMethods.panic) {
			this.logMethods.panic = this.initMethod('panic', {});
		}
		return this.logMethods.panic;
	}
}

export class SnoopLogg extends Logger {
	allow: string | RegExp | null = null;
	history: NanoBuffer<RawLogMessage> = new NanoBuffer(
		parseUnsignedInt(process.env.SNOOPLOGG_MAX_BUFFER_SIZE)
	);
	ignore: RegExp | null = null;
	onSnoopMessage: ((msg: RawLogMessage) => void) | null = null;
	proto: SnoopLogg | null = null;
	streams = new Map<Writable, SnoopLoggStreamMeta>();

	constructor(opts?: SnoopLoggOptions) {
		super();
		this.root = this;

		this.proto = Object.create(
			Functionator,
			Object.getOwnPropertyDescriptors(Logger.prototype)
		);
		Object.setPrototypeOf(
			this,
			Object.create(
				this.proto,
				Object.getOwnPropertyDescriptors(SnoopLogg.prototype)
			)
		);

		if (opts) {
			this.config(opts);
		}
	}

	config(opts: SnoopLoggOptions = {}) {
		super.config(opts);

		if (opts.maxBufferSize !== undefined) {
			try {
				this.history.maxSize = opts.maxBufferSize;
			} catch (err: unknown) {
				if (err instanceof TypeError) {
					throw new TypeError(`Invalid max buffer size: ${err.message}`);
				}
				if (err instanceof RangeError) {
					throw new RangeError(`Invalid max buffer size: ${err.message}`);
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

			allow = allows.length ? new RegExp(`^(${allows.join('|')})$`) : /./;

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
		if (!stream || !(stream instanceof Writable)) {
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
				// if (
				// 	msg &&
				// 	((msg.id === this.id && msg.enabled) ||
				// 		(msg.id !== this.id && this.isEnabled(msg.ns)))
				// ) {
				// 	// TODO: write to stream
				// }
			}
		}

		return this;
	}

	unpipe(stream: Writable) {
		if (!stream || !(stream instanceof Writable)) {
			throw new TypeError('Invalid stream');
		}

		const meta = this.streams.get(stream);
		if (meta) {
			stream.removeListener('end', meta.onEnd);
			this.streams.delete(stream);
		}
	}

	snoop(nsPrefix: string) {
		if (typeof nsPrefix !== 'string') {
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

function defaultFormatter({ args, method, ns, style, ts }: LogMessage) {
	const prefix = `${style.timestamp(ts)} ${
		ns ? `${style.namespace(ns)} ` : ''
	}${method && method !== 'log' ? `${style.method(method)} ` : ''}`;

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

	return format(...formattedArgs)
		.split('\n')
		.map(s => prefix + style.message(s, method))
		.join('\n');
}

function parseUnsignedInt(value: string | number | undefined): number {
	return value === undefined
		? 0
		: typeof value === 'number'
			? value
			: Math.max(0, Number.parseInt(value, 10));
}

function isJSON(it: unknown): boolean {
	if (it === null || typeof it !== 'object') {
		return false;
	}
	const proto = Object.getPrototypeOf(it);
	return proto?.constructor.name === 'Object';
}
