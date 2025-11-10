import replace from '@rollup/plugin-replace';
import { readFileSync } from 'node:fs';
import { defineConfig, type UserConfig } from 'tsdown';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));

const config: UserConfig = defineConfig({
	external: [
		'msgpackr',
		'ordered-binary',
	],
	entry: './src/index.ts',
	format: ['es', 'cjs'],
	minify: !process.env.SKIP_MINIFY,
	outExtensions(context) {
		return {
			js: context.format === 'cjs' ? '.cjs' : '.js',
		};
	},
	platform: 'node',
	plugins: [
		replace({
			preventAssignment: true,
			values: {
				'ROCKSDB_JS_VERSION': version,
			},
		}),
	],
	tsconfig: './tsconfig.build.json',
});
export default config;
