import { SnoopEmitter } from './emitter.js';
import { SnoopLogg } from './snooplogg.js';

export * from './is-json.js';
export * from './ns-to-rgb.js';
export * from './snooplogg.js';
export { LogLevels } from './types.js';
export { SnoopEmitter };

if (!Object.getOwnPropertyDescriptor(globalThis, '__snooplogg__')) {
	Object.defineProperty(globalThis, '__snooplogg__', { value: new SnoopEmitter() });
}

export const snooplogg: SnoopLogg = new SnoopLogg()
	.enable(process.env.SNOOPLOGG || process.env.DEBUG)
	.pipe(process.stderr);

type LogMethod = (...args: any[]) => void;

export const log: LogMethod = snooplogg.log.bind(snooplogg);
export const trace: LogMethod = snooplogg.trace.bind(snooplogg);
export const debug: LogMethod = snooplogg.debug.bind(snooplogg);
export const info: LogMethod = snooplogg.info.bind(snooplogg);
export const warn: LogMethod = snooplogg.warn.bind(snooplogg);
export const error: LogMethod = snooplogg.error.bind(snooplogg);
export const panic: LogMethod = snooplogg.panic.bind(snooplogg);
