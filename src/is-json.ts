export function isJSON(it: unknown): boolean {
	if (it === null || typeof it !== 'object') {
		return false;
	}
	const proto = Object.getPrototypeOf(it);
	return proto?.constructor.name === 'Object';
}
