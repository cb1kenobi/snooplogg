export function nsToRgb(text: string) {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0, len = text.length; i < len; i++) {
		const ch = text.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

	const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
	const h = hash % 360;
	const s = ((hash % 50) + 50) / 100;
	const l = ((hash % 60) + 30) / 100;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number, k = (n + h / 30) % 12) =>
		l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

	return {
		r: Math.round(255 * f(0)),
		g: Math.round(255 * f(8)),
		b: Math.round(255 * f(4))
	};
}
