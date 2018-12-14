'use strict';

const $          = require('gulp-load-plugins')();
const ansiColors = require('ansi-colors');
const fs         = require('fs-extra');
const gulp       = require('gulp');
const log        = require('fancy-log');
const manifest   = require('./package.json');
const path       = require('path');
const spawnSync  = require('child_process').spawnSync;

const { parallel, series } = gulp;

const coverageDir = path.join(__dirname, 'coverage');
const distDir     = path.join(__dirname, 'dist');
const docsDir     = path.join(__dirname, 'docs');

/*
 * Clean tasks
 */
async function cleanCoverage() { return fs.remove(coverageDir); }
async function cleanDist() { return fs.remove(distDir); }
async function cleanDocs() { return fs.remove(docsDir); }
exports.clean = parallel(cleanCoverage, cleanDist, cleanDocs);

/*
 * lint tasks
 */
async function lint(pattern) {
	return gulp.src(pattern)
		.pipe($.plumber())
		.pipe($.eslint())
		.pipe($.eslint.format())
		.pipe($.eslint.failAfterError());
}
async function lintSrc() { return lint('src/**/*.js'); }
async function lintTest() { return lint('test/**/test-*.js'); }
exports['lint-src'] = lintSrc;
exports['lint-test'] = lintTest;
exports.lint = parallel(lintSrc, lintTest);

/*
 * build tasks
 */
function build() {
	return gulp
		.src('src/**/*.js')
		.pipe($.plumber())
		.pipe($.debug({ title: 'build' }))
		.pipe($.sourcemaps.init())
		.pipe($.babel({
			sourceRoot: 'src'
		}))
		.pipe($.sourcemaps.write())
		.pipe(gulp.dest(distDir));
}
exports.build = series(parallel(cleanDist, lintSrc), build);
exports.default = exports.build;

exports.docs = series(parallel(cleanDocs, lintSrc), async () => {
	const esdoc = require('esdoc').default;

	esdoc.generate({
		// debug: true,
		destination: docsDir,
		plugins: [
			{
				name: 'esdoc-standard-plugin',
				option: {
					brand: {
						title:       manifest.name,
						description: manifest.description,
						respository: manifest.repository,
						site:        manifest.homepage
					}
				}
			},
			{
				name: 'esdoc-ecmascript-proposal-plugin',
				option: {
					all: true
				}
			}
		],
		source: './src'
	});
});

/*
 * test tasks
 */
async function runTests(cover) {
	const args = [];
	let { execPath } = process;

	// add nyc
	if (cover) {
		const nycModuleBinDir = resolveModuleBin('nyc');
		if (process.platform === 'win32') {
			execPath = path.join(nycModuleBinDir, 'nyc.cmd');
		} else {
			args.push(path.join(nycModuleBinDir, 'nyc'));
		}

		args.push(
			'--cache', 'false',
			'--exclude', 'test',
			'--instrument', 'false',
			'--source-map', 'false',
			// supported reporters:
			//   https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib
			'--reporter=html',
			'--reporter=json',
			'--reporter=text',
			'--reporter=text-summary',
			'--require', path.join(__dirname, 'test', 'transpile.js'),
			'--show-process-tree',
			process.execPath // need to specify node here so that spawn-wrap works
		);

		process.env.FORCE_COLOR = 1;
		process.env.COVERAGE = 1;
	}

	// add mocha
	const mocha = resolveModule('mocha');
	if (!mocha) {
		log('Unable to find mocha!');
		process.exit(1);
	}
	args.push(path.join(mocha, 'bin', 'mocha'));

	// add --inspect
	if (process.argv.indexOf('--inspect') !== -1 || process.argv.indexOf('--inspect-brk') !== -1) {
		args.push('--inspect-brk');
	}

	// add grep
	let p = process.argv.indexOf('--grep');
	if (p !== -1 && p + 1 < process.argv.length) {
		args.push('--grep', process.argv[p + 1]);
	}

	// add transpile setup
	if (!cover) {
		args.push(path.join(__dirname, 'test', 'transpile.js'));
	}

	// add unit test setup
	args.push(path.resolve(__dirname, 'test', 'setup.js'));

	// add suite
	p = process.argv.indexOf('--suite');
	if (p !== -1 && p + 1 < process.argv.length) {
		args.push.apply(args, process.argv[p + 1].split(',').map(s => 'test/**/test-' + s + '.js'));
	} else {
		args.push('test/**/test-*.js');
	}

	log(`Running: ${ansiColors.cyan(`${execPath} ${args.join(' ')}`)}`);

	// run!
	if (spawnSync(execPath, args, { stdio: 'inherit' }).status) {
		const err = new Error('At least one test failed :(');
		err.showStack = false;
		throw err;
	}
}

function resolveModuleBin(name) {
	return path.resolve(resolveModule(name), '..', '.bin');
}

function resolveModule(name) {
	let dir = path.resolve(__dirname, 'node_modules', name);
	if (fs.existsSync(dir)) {
		return dir;
	}

	try {
		return path.dirname(require.resolve(name));
	} catch (e) {
		return null;
	}
}

exports.test             = series(parallel(lintTest, build),                function test() { return runTests(); });
exports['test-only']     = series(lintTest,                                 function test() { return runTests(); });
exports.coverage         = series(parallel(cleanCoverage, lintTest, build), function test() { return runTests(true); });
exports['coverage-only'] = series(parallel(cleanCoverage, lintTest),        function test() { return runTests(true); });
