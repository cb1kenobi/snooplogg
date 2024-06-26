import { nodeResolve } from '@rollup/plugin-node-resolve';
import { defineConfig } from 'rollup';
import { dts } from 'rollup-plugin-dts';

export default defineConfig([
	{
		input: './temp/index.d.ts',
		output: {
			file: './dist/index.d.ts',
			format: 'es'
		},
		plugins: [
			nodeResolve({ preferBuiltins: true }),
			dts({
				respectExternal: true
			})
		]
	}
]);
