/**
 * This script generates lookup tables for the 'auto' style.
 */

const brotli = require('brotli');
const del = require('del');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const results = {};
const start = Date.now();
let brightness;
const outputDir = path.resolve(__dirname, '../lookup');
let totalBefore = 0;
let totalAfter = 0;

try {
	fs.statSync(outputDir);
} catch (e) {
	console.log('Creating lookup directory...');
	fs.mkdirSync(outputDir);
}
const files = fs.readdirSync(outputDir);
if (files.length) {
	console.log('Cleaning lookup directory...');
	for (const name of files) {
		fs.unlinkSync(path.join(outputDir, name));
	}
}

console.log('Building lookup...');
for (let b = 0; b <= 255; b++) {
	for (let g = 0; g <= 255; g++) {
		for (let r = 0; r <= 255; r++) {
			brightness = ((r * 299 + g * 587 + b * 114) / 1000) | 0;
			if (!results[brightness]) {
				results[brightness] = [];
			}
			results[brightness].push(r, g, b);
		}
	}
}

console.log('Writing lookup files...');
for (brightness of Object.keys(results)) {
	let colors = results[brightness];
	let before;
	let after;

	do {
		before = Buffer.from(colors);
		after = brotli.compress(before);
		if (!after) {
			// when brightness=255, there's only 1 color (3 bytes) and it's not enough bytes to make brotli happy
			colors = colors.concat(colors.slice(0, 3));
		}
	} while (!after);

	const blen = before.length;
	const alen = after.length;

	totalBefore += blen;
	totalAfter += alen;

	console.log('%s\t%s => %s\t(%s\%)', brightness, blen, alen, Math.round((blen - alen) / blen * 1000) / 10);

	fs.writeFileSync(
		`${outputDir}/${brightness}.br`,
		after,
		{ encoding: 'binary' }
	);
}

console.log('Finished in %s ms', Date.now() - start);
console.log('%s bytes => %s bytes', totalBefore, totalAfter);
