import { describe, it, expect } from 'vitest';
import { SnoopEmitter } from '../src/emitter.js';

describe('SnoopEmitter', () => {
	it('should emit a message', () => {
		const emitter = new SnoopEmitter();
		const messages: string[] = [];
		const listener = (message: string) => {
			messages.push(message);
		};
		emitter.addListener('message', listener);
		emitter.emit('message', 'test1');
		emitter.removeListener('message', listener);
		emitter.emit('message', 'test2');
		expect(messages).toEqual(['test1']);
	});
});
