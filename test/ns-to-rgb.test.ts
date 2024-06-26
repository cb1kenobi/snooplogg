import { describe, expect, it } from 'vitest';
import { nsToRgb } from '../src/index.js';

describe('nsToRGB()', () => {
	it('should deterministically convert namespace to RGB color', () => {
		const first = nsToRgb('foo');
		expect(first).toEqual({ r: 190, g: 110, b: 237 });
		expect(nsToRgb('foo')).toEqual(first);
		expect(nsToRgb('bar')).toEqual({ r: 156, g: 247, b: 110 });
	});
});
