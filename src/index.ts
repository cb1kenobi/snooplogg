import { EventEmitter } from 'node:events';
import { SnoopLogg } from './snooplogg.js';

export { SnoopLogg };

if (!Object.getOwnPropertyDescriptor(globalThis, 'snooplogg')) {
	Object.defineProperty(globalThis, 'snooplogg', { value: new EventEmitter() });
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

export * from './ns-to-rgb.js';
