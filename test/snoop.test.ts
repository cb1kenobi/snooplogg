import { WritableStream } from 'memory-streams';
import { describe, expect, it } from 'vitest';
import snooplogg, { SnoopLogg } from '../src/index.js';

const pattern = [
	'[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)',
	'(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))'
].join('|');
const stripRegExp = new RegExp(pattern, 'g');

describe('SnoopLogg', () => {
	describe('constructor()', () => {
		it('should be instance of SnoopLogg', () => {
			expect(snooplogg).toBeInstanceOf(Function);
		});

		it('should error if SnoopLogg options are invalid', () => {
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				new SnoopLogg('foo' as any);
			}).toThrowError(new TypeError('Expected logger options to be an object'));
		});

		it('should not clobber instance specific prototypes', () => {
			const logger1 = new SnoopLogg();

			// @ts-expect-error protoId is a hidden property
			expect(logger1.id).toBe(logger1.protoId);

			const logger2 = new SnoopLogg();

			// @ts-expect-error protoId is a hidden property
			expect(logger1.id).toBe(logger1.protoId);

			// @ts-expect-error protoId is a hidden property
			expect(logger2.id).toBe(logger2.protoId);

			const logger1ns = logger1('foo');

			// @ts-expect-error protoId is a hidden property
			expect(logger1ns.root.id).toBe(logger1.protoId);
			expect(logger1ns.root.protoId).toBe(logger1ns.protoId);
		});
	});

	describe('config()', () => {
		it('should error if config options are invalid', () => {
			const instance = new SnoopLogg();
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				instance.config('foo' as any);
			}).toThrowError(new TypeError('Expected logger options to be an object'));
		});
	});

	describe('log methods', () => {
		it('should write log messages to the specified stream', () => {
			const methods = [
				'log',
				'trace',
				'debug',
				'info',
				'warn',
				'error',
				'panic'
			];

			for (const method of methods) {
				const prefix = `\\s*\\d\\.\\d{3}s ${method === 'log' ? '' : method.toUpperCase().padEnd(6)}`;
				const testCases = [
					{
						input: [`This is a test "${method}" message`],
						expected: new RegExp(
							`^${prefix}This is a test "${method}" message$`
						)
					},
					{
						input: [
							'This string uses format to display %s and %d',
							'this string',
							3.14
						],
						expected: new RegExp(
							`^${prefix}This string uses format to display this string and 3.14$`
						)
					},
					{
						input: ['This is a multiline\nstring'],
						expected: new RegExp(
							`^${prefix}This is a multiline\n${prefix}string$`,
							'm'
						)
					},
					{
						input: [3.14],
						expected: new RegExp(`^${prefix}3.14$`)
					},
					{
						input: [new Error('This is an error')],
						expected: new RegExp(`^${prefix}Error: This is an error`)
					},
					{
						input: [{ foo: 'bar', colors: ['red', 'green', 'blue'] }],
						expected: new RegExp(
							`^${prefix}{\n${prefix}  foo: 'bar',\n${prefix}  colors: \\[\n${prefix}    'red',\n${prefix}    'green',\n${prefix}    'blue'\n${prefix}  \\]\n${prefix}}$`,
							'm'
						)
					}
				];

				for (const { input, expected } of testCases) {
					const out = new WritableStream();
					const instance = new SnoopLogg().enable('*').pipe(out);
					instance[method](...input);
					const output = out.toString().trim().replace(stripRegExp, '');
					expect(output).toMatch(expected);
				}
			}
		});
	});

	describe('enable / isEnabled', () => {
		it('should error if enable filter is invalid', () => {
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				new SnoopLogg().enable(123 as any);
			}).toThrowError(
				new TypeError('Expected pattern to be a string or regex')
			);
		});

		it('should test if a logger is enabled', () => {
			const instance = new SnoopLogg();

			instance.enable('foo');
			expect(instance.isEnabled('foo')).toBe(true);
			expect(instance.isEnabled('bar')).toBe(false);
			// biome-ignore lint/suspicious/noExplicitAny: Test case
			expect(instance.isEnabled(undefined as any)).toBe(true);

			instance.enable('*');
			expect(instance.isEnabled('foo')).toBe(true);
			expect(instance.isEnabled('bar')).toBe(true);
			// biome-ignore lint/suspicious/noExplicitAny: Test case
			expect(instance.isEnabled(undefined as any)).toBe(true);

			instance.enable();
			expect(instance.isEnabled('foo')).toBe(false);

			instance.enable(/^foo/);
			expect(instance.isEnabled('foo')).toBe(true);
			expect(instance.isEnabled('foobar')).toBe(true);
			expect(instance.isEnabled('barfoo')).toBe(false);

			instance.enable('foo,bar');
			expect(instance.isEnabled('foo')).toBe(true);
			expect(instance.isEnabled('bar')).toBe(true);
			expect(instance.isEnabled('baz')).toBe(false);

			instance.enable('foo,-bar');
			expect(instance.isEnabled('foo')).toBe(true);
			expect(instance.isEnabled('bar')).toBe(false);

			instance.enable('');
			expect(instance.isEnabled('foo')).toBe(false);
		});
	});

	describe('pipe / unpipe', () => {
		it('should error if pipe stream is invalid', () => {
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				new SnoopLogg().pipe('foo' as any);
			}).toThrowError(new TypeError('Invalid stream'));
		});

		it('should only add the pipe stream once', () => {
			const out = new WritableStream();
			const instance = new SnoopLogg().enable('*').pipe(out).pipe(out);
			expect(instance.streams.size).toBe(1);
			instance.log('foo');
			expect(out.toString().trim().replace(stripRegExp, '')).toMatch(
				/^\s*\d\.\d{3}s foo$/
			);
		});

		it('should unpipe a stream', () => {
			const out = new WritableStream();
			const instance = new SnoopLogg().enable('*').pipe(out);
			instance.log('foo');
			expect(out.toString().trim().replace(stripRegExp, '')).toMatch(
				/^\s*\d\.\d{3}s foo$/
			);
			instance.unpipe(out);
			instance.log('bar');
			expect(out.toString().trim().replace(stripRegExp, '')).toMatch(
				/^\s*\d\.\d{3}s foo$/
			);
		});

		it('should error if unpipe stream is invalid', () => {
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				new SnoopLogg().unpipe('foo' as any);
			}).toThrowError(new TypeError('Invalid stream'));
		});
	});

	describe('format', () => {
		it('should error if format function is invalid', () => {
			const instance = new SnoopLogg();
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				instance.config({ format: 'foo' } as any);
			}).toThrowError(new TypeError('Expected format to be a function'));
		});

		it('should apply a custom format', () => {
			const out = new WritableStream();
			const instance = new SnoopLogg({
				format(msg, styles) {
					return `${msg.elements.timestamp(msg.ts, styles)} ${String(msg.args[0]).toUpperCase()}`;
				}
			})
				.enable('*')
				.pipe(out);
			instance.log('foo');
			const output = out.toString().trim().replace(stripRegExp, '');
			expect(output).toMatch(
				/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} FOO$/
			);
		});

		// it.only('should', () => {
		// 	const out = new WritableStream();
		// 	const instance = new SnoopLogg({
		// 		format(msg) {
		// 			return `ROOT ${String(msg.args[0]).toUpperCase()}`;
		// 		}
		// 	})
		// 		.enable('*')
		// 		.pipe(out);

		// 	const foo = instance('foo')
		// 		.config({
		// 			format(msg) {
		// 				return `FOO ${String(msg.args[0]).toLowerCase()}`;
		// 			}
		// 		});

		// 	instance.log('bar');
		// 	foo.log('bar');
		// 	const output = out.toString().trim().replace(stripRegExp, '');
		// 	console.log(output);
		// });
	});

	describe('elements', () => {
		it('should error if elements is invalid', () => {
			const instance = new SnoopLogg();
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				instance.config({ elements: 'foo' } as any);
			}).toThrowError(new TypeError('Expected elements to be an object'));
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				instance.config({ elements: { error: 'foo' as any } });
			}).toThrowError(
				new TypeError('Expected "error" elements to be a function')
			);
		});

		it('should apply a custom format', () => {
			const out = new WritableStream();
			const instance = new SnoopLogg({
				elements: {
					method(name) {
						return `[${name}]`;
					},
					uptime() {
						return '>>>';
					}
				}
			})
				.enable('*')
				.pipe(out);
			instance.info('foo');
			const output = out.toString().trim().replace(stripRegExp, '');
			expect(output).toBe('>>> [info] foo');
		});
	});

	describe('nested loggers', () => {
		it('should create a nested logger', () => {
			const out = new WritableStream();
			const instance = new SnoopLogg().pipe(out);
			const foo = instance('foo');
			const bar = foo('bar');

			expect(foo.enabled).toBe(false);
			expect(bar.enabled).toBe(false);
			instance.enable('*');
			expect(foo.enabled).toBe(true);
			expect(bar.enabled).toBe(true);

			bar.log('baz');
			expect(out.toString().trim().replace(stripRegExp, '')).toMatch(
				/^\s*\d\.\d{3}s foo:bar baz$/
			);
		});

		it('should enable output by root', () => {
			let out = new WritableStream();
			const instance = new SnoopLogg().enable('bar').pipe(out);
			const foo = instance('foo');
			const bar = foo('bar');
			const baz = foo('baz');
			bar.log('wiz');
			expect(out.toString().trim().replace(stripRegExp, '')).toBe('');

			instance.enable('foo');
			bar.log('wiz');
			baz.log('zap');
			expect(out.toString().trim().replace(stripRegExp, '')).toMatch(
				/^\s*\d\.\d{3}s foo:bar wiz\n\s*\d\.\d{3}s foo:baz zap$/m
			);

			instance.unpipe(out);
			out = new WritableStream();
			instance.pipe(out);

			instance.enable('foo:bar');
			bar.log('pow');
			baz.log('zip');
			expect(out.toString().trim().replace(stripRegExp, '')).toMatch(
				/^\s*\d\.\d{3}s foo:bar pow$/m
			);

			instance.unpipe(out);
			out = new WritableStream();
			instance.pipe(out);

			instance.enable('foo*');
			bar.log('pow');
			baz.log('zip');
			expect(out.toString().trim().replace(stripRegExp, '')).toMatch(
				/^\s*\d\.\d{3}s foo:bar pow$/m
			);
		});

		it('should error if logger name is invalid', () => {
			const instance = new SnoopLogg();
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				instance(123 as any);
			}).toThrowError(new TypeError('Expected namespace to be a string'));

			expect(() => {
				instance('foo bar');
			}).toThrowError(
				new TypeError('Namespace cannot contain spaces or commas')
			);
		});
	});

	describe('history', () => {
		it('should set the history size', () => {
			const instance = new SnoopLogg();
			expect(instance.history.maxSize).toBe(0);
			instance.config({ historySize: 10 });
			expect(instance.history.maxSize).toBe(10);
		});

		it('should error if history size is invalid', () => {
			const instance = new SnoopLogg();
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				instance.config({ historySize: 'foo' } as any);
			}).toThrowError(
				new TypeError('Invalid history size: Expected max size to be a number')
			);

			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				instance.config({ historySize: -1 } as any);
			}).toThrowError(
				new RangeError(
					'Invalid history size: Expected max size to be zero or greater'
				)
			);
		});

		it('should flush the history to a piped stream', () => {
			const instance = new SnoopLogg().config({ historySize: 10 }).enable('*');
			instance.log('foo');

			const out = new WritableStream();
			instance.pipe(out, { flush: true });
			expect(out.toString().trim().replace(stripRegExp, '')).toMatch(
				/^\s*\d\.\d{3}s foo$/
			);
		});
	});

	describe('snoop / unsnoop', () => {
		it('should error if namespace is invalid', () => {
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				new SnoopLogg().snoop(123 as any);
			}).toThrowError(
				new TypeError('Expected namespace prefix to be a string')
			);
		});

		it('should snoop on another instance', () => {
			const out = new WritableStream();
			const instance = new SnoopLogg().enable('*').pipe(out);
			const instance2 = new SnoopLogg().enable();
			instance2.log('foo');
			instance.snoop();
			instance2.log('bar');
			const output = out.toString().trim().replace(stripRegExp, '');
			expect(output).toMatch(/^\s*\d\.\d{3}s bar$/);
		});

		it('should snoop on another instance using a namespace', () => {
			const out = new WritableStream();
			const instance = new SnoopLogg().enable('*').pipe(out);
			const instance2 = new SnoopLogg().enable('*');
			instance2.log('foo');
			instance.snoop('baz');
			instance2.log('bar');
			const output = out.toString().trim().replace(stripRegExp, '');
			expect(output).toMatch(/^\s*\d\.\d{3}s baz bar$/);
		});

		it('should receive messages if source is not enabled', () => {
			const out = new WritableStream();
			const instance = new SnoopLogg().enable('*').pipe(out);
			const instance2 = new SnoopLogg();
			instance2.log('foo');
			instance.snoop();
			instance2.log('bar');
			const output = out.toString().trim().replace(stripRegExp, '');
			expect(output).toMatch(/^\s*\d\.\d{3}s bar$/);
		});

		it('should stop snooping', () => {
			const out = new WritableStream();
			const instance = new SnoopLogg().enable('*').pipe(out);
			const instance2 = new SnoopLogg().enable();
			instance2.log('foo');
			instance.snoop();
			instance2.log('bar');
			instance.unsnoop();
			instance2.log('baz');
			const output = out.toString().trim().replace(stripRegExp, '');
			expect(output).toMatch(/^\s*\d\.\d{3}s bar$/);
		});
	});
});
