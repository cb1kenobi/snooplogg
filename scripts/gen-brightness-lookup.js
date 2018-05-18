/**
 * This script generates lookup tables for the 'auto' style.
 */

const brotli = require('brotli');
const del = require('del');
const fs = require('fs');
const path = require('path');

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
			results[brightness].push((r << 16) + (g << 8) + b);
		}
	}
}

console.log();

for (brightness = 0; brightness < 256; brightness++) {
	const colors = results[brightness].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
	const total = colors.length;
	let last = colors.shift();
	const ranges = [];
	let range = 0;

	// build the ranges
	ranges[range] = [ last ];
	for (const i of colors) {
		if (i > last + 1) {
			range++;
		}
		if (!Array.isArray(ranges[range])) {
			ranges[range] = [];
		}
		ranges[range].push(i);
		last = i;
	}

	// build the before buffer
	const size = Math.max(4 + (ranges.length * 4) + ranges.length, 80);
	const before = Buffer.alloc(size);
	before.writeUInt32LE(total, 0); // total colors in this brightness

	let offset = 4;
	for (let i = 0; i < ranges.length; i++) {
		before.writeUInt8(ranges[i].length, offset++); // number of colors in the range
		before.writeUInt32LE(ranges[i][0], offset);    // integer representation of rgb value
		offset += 4;
	}

	let after;
	do {
		after = brotli.compress(before);
		if (!after) {
			before.writeUInt8(0, offset++);
		}
	} while (!after);

	const blen = before.length;
	const alen = after.length;

	totalBefore += blen;
	totalAfter += alen;

	console.log(`Brightness: ${brightness}\tColors: ${total}\tRanges: ${ranges.length}\tSize: ${size}\tBefore: ${blen}\tAfter: ${alen}\t(${Math.round((blen - alen) / blen * 1000) / 10}%)`);

	fs.writeFileSync(
		`${outputDir}/${brightness}.br`,
		after,
		{ encoding: 'binary' }
	);
}

console.log('\nFinished in %s ms', Date.now() - start);
console.log('%s bytes => %s bytes', totalBefore, totalAfter);
