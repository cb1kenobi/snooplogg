'use strict';

const $ = require('gulp-load-plugins')();
const del = require('del');
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
		.pipe($.babel({
			sourceMaps: 'inline'
		}))
		.pipe(gulp.dest(distDir));
});

gulp.task('docs', ['lint-src', 'clean-docs'], function () {
	return gulp.src('src')
		.pipe($.plumber())
		.pipe($.debug({ title: 'docs' }))
		.pipe($.esdoc({
			// debug: true,
			destination: docsDir,
			plugins: [
				{ name: 'esdoc-es7-plugin' }
			],
			title: manifest.name
		}));
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

	// add nyc
	if (cover) {
		args.push(
			path.resolve(__dirname, 'node_modules', '.bin', 'nyc'),
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
	args.push(path.resolve(__dirname, 'node_modules', '.bin', 'mocha'));

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

	$.util.log('Running: ' + $.util.colors.cyan(process.execPath + ' ' + args.join(' ')));

	// run!
	spawnSync(process.execPath, args, { stdio: 'inherit' });
}

gulp.task('default', ['build']);
