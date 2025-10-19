import { defineConfig, type UserConfig } from 'tsdown';
import replace from '@rollup/plugin-replace';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));

const config: UserConfig = defineConfig({
	external: [
		'msgpackr',
		'ordered-binary'
	],
	entry: './src/index.ts',
	format: ['es', 'cjs'],
	minify: !process.env.SKIP_MINIFY,
	platform: 'node',
	plugins: [
		replace({
			preventAssignment: true,
			values: {
				'ROCKSDB_JS_VERSION': version
			}
		})
	],
	tsconfig: './tsconfig.build.json'
});
export default config;