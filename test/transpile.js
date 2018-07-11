const fs = require('fs');
const Module = require('module');
const path = require('path');

const babelRE = /^(babel-|@babel\/)\w+/;
const minifyRE = /^minify|babili$/;
const conf = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '.babelrc')));
const originalResolveFilename = Module._resolveFilename;

if (process.env.COVERAGE && conf.plugins.indexOf('istanbul') === -1) {
	// inject the istanbul babel plugin
	conf.plugins.unshift([
		'istanbul',
		{ exclude: 'test' }
	]);
}

// remove babili from tests and resolve all babel plugins/presets
Object.keys(conf).forEach(function (key) {
	if ((key === 'plugins' || key === 'presets') && Array.isArray(conf[key])) {
		for (var i = 0; i < conf[key].length; i++) {
			const isArr = Array.isArray(conf[key][i]);
	 		let name = isArr ? conf[key][i][0] : conf[key][i];
			if (minifyRE.test(name)) {
				conf[key].splice(i--, 1);
			} else {
				name = originalResolveFilename(babelRE.test(name) ? name : `babel-${key.slice(0, -1)}-${name}`, module);
				if (isArr) {
					conf[key][i][0] = name;
				} else {
					conf[key][i] = name;
				}
			}
		}
	} else {
		delete conf[key];
	}
});

// only transpile src and tests
conf.only = [ 'src', 'test' ];

conf.ignore = [];

conf.cache = true;

// console.log(conf);

require('@babel/register')(conf);

/**
 * The unit tests reference the source files in the `dist` directory and for coverage tests, they
 * are transpiled on-the-fly, so we need to force them to be resolved in the `src` directory
 * instead.
 */
if (process.env.COVERAGE) {
	const cwd = process.cwd();
	const realcwd = fs.realpathSync(cwd);
	const distDir = path.join(cwd, 'dist');
	const srcDir = path.join(cwd, 'src');
	const distRegExp = /[\//]dist[\//]/;
	const distGRegExp = /([/\\])dist([/\\])/g;

	Module._resolveFilename = function (request, parent, isMain) {
		const parentId = parent && path.resolve(parent.id);
		if (distRegExp.test(request) && parentId && (parentId.startsWith(cwd) || parentId.startsWith(realcwd)) && !parentId.includes('node_modules')) {
			request = request.replace(distGRegExp, (m, q1, q2) => `${q1}src${q2}`);
		}
		return originalResolveFilename(request, parent, isMain);
	};
}
