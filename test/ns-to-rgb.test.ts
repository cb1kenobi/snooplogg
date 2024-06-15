import { describe, expect, it } from 'vitest';
import { nsToRgb } from '../src/index.js';

describe('nsToRGB()', () => {
	it('should deterministically convert namespace to RGB color', () => {
		const first = nsToRgb('foo');
		expect(first).toEqual({ r: 133, g: 163, b: 224 });
		expect(nsToRgb('foo')).toEqual(first);
		expect(nsToRgb('bar')).toEqual({ r: 188, g: 193, b: 240 });
	});
});
