import ansiStyles from 'ansi-styles';
import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripRegExp } from '../dist/index.js';

const wo = ansiStyles.bgWhiteBright.open;
const wc = ansiStyles.bgWhiteBright.close;
const bo = ansiStyles.black.open;
const bc = ansiStyles.black.close;

const root = dirname(fileURLToPath(new URL('.', import.meta.url)));
const files = await readdir(join(root, 'examples'));
const width = 100;

for (const filename of files.sort()) {
	// if (!filename.startsWith('07')) {
	// 	continue;
	// }
	if (filename.endsWith('.js')) {
		const file = join(root, 'examples', filename);
		const { name } = parse(filename);
		const { stdout } = spawnSync(process.execPath, [file], {
			encoding: 'utf8',
		});
		console.log(
			`\n${wo} ${bo}${name}${bc}${' '.padEnd(width - name.length)} ${wc}`
		);
		console.log(`${wo} ${wc}${' '.repeat(width)}${wo} ${wc}`);
		for (let line of stdout.trimEnd().split('\n')) {
			if (/\/users\//i.test(line)) {
				line = line.replace(/(file:.+snooplogg)/i, 'file:.../snooplogg');
			}
			const len = line.replace(stripRegExp, '').length;
			console.log(
				`${wo} ${wc}${line}${width - len > 0 ? ' '.repeat(width - len) : ''}${wo} ${wc}`
			);
		}
		console.log(`${wo} ${wc}${' '.repeat(width)}${wo} ${wc}`);
		console.log(`${wo}${' '.padEnd(width + 2)}${wc}`);
	}
}
