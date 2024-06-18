import { describe, expect, it } from 'vitest';
import { isJSON } from '../src/is-json.js';

describe('isJSON()', () => {
	it('should detect a JSON object', () => {
		expect(isJSON({})).toBe(true);
		expect(isJSON({ foo: 'bar' })).toBe(true);
	});

	it('should not detect a JSON object', () => {
		expect(isJSON(null)).toBe(false);
		expect(isJSON(undefined)).toBe(false);
		expect(isJSON('')).toBe(false);
		expect(isJSON(0)).toBe(false);
		expect(isJSON([])).toBe(false);
		expect(isJSON(new Map())).toBe(false);
		expect(isJSON(new Set())).toBe(false);
		expect(isJSON(new Date())).toBe(false);
		expect(isJSON(new Error())).toBe(false);
		expect(isJSON(/(?:)/)).toBe(false);
		expect(isJSON(() => {})).toBe(false);
		expect(isJSON(Symbol())).toBe(false);

		class Foo {}
		expect(isJSON(new Foo())).toBe(false);
	});
});
