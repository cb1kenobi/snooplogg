'use strict';

const $ = require('gulp-load-plugins')();
const del = require('del');
const fs = require('fs');
const gulp = require('gulp');
const manifest = require('./package.json');
const path = require('path');
const spawnSync = require('child_process').spawnSync;

const coverageDir = path.join(__dirname, 'coverage');
const distDir = path.join(__dirname, 'dist');
const docsDir = path.join(__dirname, 'docs');

/*
 * Clean tasks
 */
gulp.task('clean', ['clean-coverage', 'clean-dist', 'clean-docs']);

gulp.task('clean-coverage', done => { del([coverageDir]).then(() => done()) });

gulp.task('clean-dist', done => { del([distDir]).then(() => done()) });

gulp.task('clean-docs', done => { del([docsDir]).then(() => done()) });

/*
 * build tasks
 */
gulp.task('build', ['clean-dist', 'lint-src'], function () {
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
});

gulp.task('docs', ['lint-src', 'clean-docs'], () => {
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
						respository: 'https://github.com/cb1kenobi/cli-kit',
						site:        'https://github.com/cb1kenobi/cli-kit'
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
 * lint tasks
 */
function lint(pattern) {
	return gulp.src(pattern)
		.pipe($.plumber())
		.pipe($.eslint())
		.pipe($.eslint.format())
		.pipe($.eslint.failAfterError());
}

gulp.task('lint-src', () => lint('src/**/*.js'));

gulp.task('lint-test', () => lint('test/**/test-*.js'));

/*
 * test tasks
 */
gulp.task('test', ['build', 'lint-test'], () => runTests());
gulp.task('test-only', ['lint-test'], () => runTests());
gulp.task('coverage', ['clean-coverage', 'lint-src', 'lint-test'], () => runTests(true));
gulp.task('coverage-only', ['clean-coverage', 'lint-test'], () => runTests(true));

function runTests(cover) {
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
			'--exclude', '!test/examples',
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

	$.util.log('Running: ' + $.util.colors.cyan(execPath + ' ' + args.join(' ')));

	const env = Object.assign({}, process.env, {
		FORCE_COLOR: 1,
		COLORTERM: 'truecolor'
	});
	delete env.CI;

	// run!
	if (spawnSync(execPath, args, { env, stdio: 'inherit' }).status) {
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

gulp.task('default', ['build']);
