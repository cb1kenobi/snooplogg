// import supportsColor from 'supports-color';
// import chalk, { Chalk } from 'chalk';
// import { Transform, Writable } from 'node:stream';

import { EventEmitter } from 'node:events';
import { Writable } from 'node:stream';
import { format, inspect } from 'node:util';
import { NanoBuffer } from './nanobuffer.js';

if (!Object.getOwnPropertyDescriptor(globalThis, 'snooplogg')) {
	Object.defineProperty(globalThis, 'snooplogg', { value: new EventEmitter() });
}

type LogMethod = (...args: unknown[]) => Logger;

type SnoopLoggStyle = {
	ns?: (ns: string) => string;
};

type SnoopLoggOptions = {
	maxBufferSize?: number;
	styles?: Record<string, SnoopLoggStyle>;
};

type SnoopLoggMessage = {
	args: unknown[];
	enabled: boolean;
	id: number;
	method: string;
	ns: string;
	ts: Date;
};

type SnoopLoggStreamMeta = {
	onEnd: () => void;
};

const namespaceFilterRE = /[\s,]+/;

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
	id = Math.round(Math.random() * 1e9);
	#logMethods: Record<string, LogMethod> = {};
	ns: string;
	#nsPath: string[];
	#parent: Logger | null;
	root: SnoopLogg | undefined;
	#subnamespaces: Record<string, Logger> = {};

	constructor(namespace?: string, parent: Logger | null = null, root?: SnoopLogg) {
		if (namespace !== undefined) {
			if (typeof namespace !== 'string') {
				throw new TypeError('Expected namespace to be a string');
			}
			if (namespaceFilterRE.test(namespace)) {
				throw new Error('Namespace cannot contain spaces or commas');
			}
		}

		super((namespace: string) => {
			if (this.root && !this.#subnamespaces[namespace]) {
				// TODO: do we need to bind??
				this.#subnamespaces[namespace] = Object.setPrototypeOf(
					new Logger(namespace, this, this.root),
					this.root.proto
				);
			}
			return this.#subnamespaces[namespace];
		});

		this.#nsPath = !namespace
			? []
			: parent
				? [...parent.#nsPath, namespace]
				: [namespace];
		this.ns = this.#nsPath.join(':');
		this.#parent = parent;
		this.root = root;
	}

	get enabled() {
		return this.root?.isEnabled(this.ns) || false;
	}

	#initMethod(method: string, props) {
		return (...args: unknown[]) => {
			this.root?.dispatch({
				id: this.root.id,
				args,
				method,
				ns: this.ns,
				ts: new Date(),
				enabled: this.enabled
			});
			return this;
		};
	}

	get log() {
		if (!this.#logMethods.log) {
			this.#logMethods.log = this.#initMethod('log', {});
		}
		return this.#logMethods.log;
	}

	get trace() {
		if (!this.#logMethods.trace) {
			this.#logMethods.trace = this.#initMethod('trace', {});
		}
		return this.#logMethods.trace;
	}

	get debug() {
		if (!this.#logMethods.debug) {
			this.#logMethods.debug = this.#initMethod('debug', {});
		}
		return this.#logMethods.debug;
	}

	get info() {
		if (!this.#logMethods.info) {
			this.#logMethods.info = this.#initMethod('info', {});
		}
		return this.#logMethods.info;
	}

	get warn() {
		if (!this.#logMethods.warn) {
			this.#logMethods.warn = this.#initMethod('warn', {});
		}
		return this.#logMethods.warn;
	}

	get error() {
		if (!this.#logMethods.error) {
			this.#logMethods.error = this.#initMethod('error', {});
		}
		return this.#logMethods.error;
	}

	get panic() {
		if (!this.#logMethods.panic) {
			this.#logMethods.panic = this.#initMethod('panic', {});
		}
		return this.#logMethods.panic;
	}
}

function parseUnsignedInt(value: string | number | undefined): number {
	return value === undefined
		? 0
		: typeof value === 'number'
			? value
			: Math.max(0, Number.parseInt(value, 10));
}

export class SnoopLogg extends Logger {
	#allow: string | RegExp | null = null;
	#history: NanoBuffer<SnoopLoggMessage> = new NanoBuffer(
		parseUnsignedInt(process.env.SNOOPLOGG_MAX_BUFFER_SIZE)
	);
	#ignore: RegExp | null = null;
	#onSnoopMessage: ((msg: SnoopLoggMessage) => void) | null = null;
	proto: SnoopLogg | null = null;
	#streams = new Map<Writable, SnoopLoggStreamMeta>();
	#styles: Record<string, unknown> = {};

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
		if (typeof opts !== 'object') {
			throw new TypeError('Expected SnoopLogg options to be an object');
		}

		if (opts.styles !== undefined) {
			if (typeof opts.styles !== 'object') {
				throw new TypeError('Expected styles to be an object');
			}
			this.#styles = opts.styles;
		}

		if (opts.maxBufferSize !== undefined) {
			try {
				this.#history.maxSize = opts.maxBufferSize;
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

	dispatch(msg: SnoopLoggMessage) {
		if (!msg || typeof msg !== 'object') {
			throw new TypeError('Invalid message');
		}

		if (!Array.isArray(msg.args)) {
			throw new TypeError('Invalid message arguments');
		}

		this.#history.push(msg);

		if (
			(msg.id === this.id && msg.enabled) ||
			(msg.id !== this.id && this.isEnabled(msg.ns))
		) {
			for (const [stream, meta] of this.#streams.entries()) {
				stream.write(stream.writableObjectMode ? msg : renderMessage(msg));
			}
		}

		if (msg.id === this.id) {
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

			for (let p of pattern.split(namespaceFilterRE)) {
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

		this.#allow = allow;
		this.#ignore = ignore;

		return this;
	}

	isEnabled(namespace: string) {
		const allow = this.#allow;
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
			(!this.#ignore || !this.#ignore.test(namespace))
		) {
			return true;
		}

		return false;
	}

	pipe(stream: Writable, opts: { flush?: boolean } = {}) {
		if (!stream || !(stream instanceof Writable)) {
			throw new TypeError('Invalid stream');
		}

		if (this.#streams.has(stream)) {
			return this;
		}

		const onEnd = () => this.#streams.delete(stream);
		this.#streams.set(stream, { onEnd });
		stream.on('end', onEnd);

		if (opts.flush) {
			for (const msg of this.#history) {
				if (
					msg &&
					((msg.id === this.id && msg.enabled) ||
						(msg.id !== this.id && this.isEnabled(msg.ns)))
				) {
					// TODO: write to stream
				}
			}
		}

		return this;
	}

	unpipe(stream: Writable) {
		if (!stream || !(stream instanceof Writable)) {
			throw new TypeError('Invalid stream');
		}

		const meta = this.#streams.get(stream);
		if (meta) {
			stream.removeListener('end', meta.onEnd);
			this.#streams.delete(stream);
		}
	}

	snoop(nsPrefix: string) {
		if (typeof nsPrefix !== 'string') {
			throw new TypeError('Expected namespace prefix to be a string');
		}

		this.unsnoop();

		this.#onSnoopMessage = (msg: SnoopLoggMessage) => {
			if (msg.id !== this.id) {
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

		globalThis.snooplogg.on('message', this.#onSnoopMessage);

		return this;
	}

	unsnoop() {
		if (this.#onSnoopMessage) {
			globalThis.snooplogg.off('message', this.#onSnoopMessage);
			this.#onSnoopMessage = null;
		}
		return this;
	}
}

function renderMessage(msg: SnoopLoggMessage) {
	if (msg && typeof msg === 'object' && !(msg instanceof Buffer)) {
		// TODO: apply theme formatter
		return `${format(...msg.args)}\n`;
	}
	return String(msg);
}

export function nsToRgb(text: string) {
	let hash = 0;
	for (let i = 0, len = text.length; i < len; i++) {
		hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
	}
	hash = Math.abs(hash);

	const h = hash % 360;
	const s = (hash % 100) / 100;
	const l = ((hash % 60) + 30) / 100;
	const a = s * Math.min(l, 1 - l);
	const f = (n, k = (n + h / 30) % 12) =>
		l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

	return {
		r: Math.round(255 * f(0)),
		g: Math.round(255 * f(8)),
		b: Math.round(255 * f(4))
	};
}

const instance = new SnoopLogg()
	.enable(process.env.SNOOPLOGG || process.env.DEBUG)
	.pipe(process.stderr);

export const log = instance.log.bind(instance);
export const trace = instance.trace.bind(instance);
export const debug = instance.debug.bind(instance);
export const info = instance.info.bind(instance);
export const warn = instance.warn.bind(instance);
export const error = instance.error.bind(instance);
export const panic = instance.panic.bind(instance);

export default instance;
