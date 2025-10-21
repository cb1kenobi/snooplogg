import { EventEmitter } from './events.js';
import { SnoopLogg } from './snooplogg.js';

export * from './is-json.js';
export * from './ns-to-rgb.js';
export * from './snooplogg.js';
export { LogLevels } from './types.js';

if (!Object.getOwnPropertyDescriptor(globalThis, 'snooplogg')) {
	Object.defineProperty(globalThis, 'snooplogg', { value: new EventEmitter() });
}

const instance: SnoopLogg = new SnoopLogg()
	.enable(process.env.SNOOPLOGG || process.env.DEBUG)
	.pipe(process.stderr);

type LogMethod = (...args: any[]) => void;

export const log: LogMethod = instance.log.bind(instance);
export const trace: LogMethod = instance.trace.bind(instance);
export const debug: LogMethod = instance.debug.bind(instance);
export const info: LogMethod = instance.info.bind(instance);
export const warn: LogMethod = instance.warn.bind(instance);
export const error: LogMethod = instance.error.bind(instance);
export const panic: LogMethod = instance.panic.bind(instance);

export default instance;
