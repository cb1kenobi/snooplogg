import { WritableStream } from 'memory-streams';
import { describe, expect, it } from 'vitest';
import snooplogg, { SnoopLogg } from '../src/index.js';

// import util from 'node:util';
// import {
// 	createInstanceWithDefaults,
// 	Format,
// 	SnoopLogg,
// 	StripColors
// } from '../src/index.js';
// import { Console } from 'node:console';
// import { Transform, Writable } from 'node:stream';

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

	describe('logging', () => {
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
				const prefix = `\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}\\.\\d{3} ${method === 'log' ? '' : method.toUpperCase().padEnd(6)}`;
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
				/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} foo$/
			);
		});

		it('should unpipe a stream', () => {
			const out = new WritableStream();
			const instance = new SnoopLogg().enable('*').pipe(out);
			instance.log('foo');
			expect(out.toString().trim().replace(stripRegExp, '')).toMatch(
				/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} foo$/
			);
			instance.unpipe(out);
			instance.log('bar');
			expect(out.toString().trim().replace(stripRegExp, '')).toMatch(
				/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} foo$/
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
				format(msg) {
					return `${String(msg.args[0]).toUpperCase()}`;
				}
			})
				.enable('*')
				.pipe(out);
			instance.log('foo');
			const output = out.toString().trim().replace(stripRegExp, '');
			expect(output).toBe('FOO');
		});
	});

	describe('style', () => {
		it('should error if style is invalid', () => {
			const instance = new SnoopLogg();
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				instance.config({ style: 'foo' } as any);
			}).toThrowError(new TypeError('Expected style to be an object'));
			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: Test case
				instance.config({ style: { error: 'foo' as any } });
			}).toThrowError(new TypeError('Expected "error" style to be a function'));
		});

		it('should apply a custom format', () => {
			const out = new WritableStream();
			const instance = new SnoopLogg({
				style: {
					method(name) {
						return `[${name}]`;
					},
					timestamp() {
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

	// nested logger

	// filtering enable()

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
				/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} foo$/
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
	});
});

// 	it('should filter messages', () => {
// 		let count = 0;

// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				count++;
// 				cb();
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.enable(null)
// 			.pipe(new MockOutputStream);

// 		const fooLogger = instance('foo');
// 		const barLogger = fooLogger('bar');

// 		expect(fooLogger.enabled).to.be.false;
// 		expect(barLogger.enabled).to.be.false;
// 		instance.log('log() test');
// 		fooLogger.log('foo log() test');
// 		barLogger.log('bar log() test');
// 		expect(count).to.equal(0);

// 		instance.enable('*');

// 		count = 0;
// 		expect(fooLogger.enabled).to.be.true;
// 		expect(barLogger.enabled).to.be.true;
// 		instance.log('log() test');
// 		fooLogger.log('foo log() test');
// 		barLogger.log('bar log() test');
// 		expect(count).to.equal(3);

// 		instance.enable('foo');

// 		count = 0;
// 		expect(fooLogger.enabled).to.be.true;
// 		expect(barLogger.enabled).to.be.false;
// 		instance.log('log() test');
// 		fooLogger.log('foo log() test');
// 		barLogger.log('bar log() test');
// 		expect(count).to.equal(2);

// 		instance.enable('foo*');

// 		count = 0;
// 		expect(fooLogger.enabled).to.be.true;
// 		expect(barLogger.enabled).to.be.true;
// 		instance.log('log() test');
// 		fooLogger.log('foo log() test');
// 		barLogger.log('bar log() test');
// 		expect(count).to.equal(3);

// 		instance.enable('bar');

// 		count = 0;
// 		expect(fooLogger.enabled).to.be.false;
// 		expect(barLogger.enabled).to.be.false;
// 		instance.log('log() test');
// 		fooLogger.log('foo log() test');
// 		barLogger.log('bar log() test');
// 		expect(count).to.equal(1);

// 		instance.enable('*bar');

// 		count = 0;
// 		expect(fooLogger.enabled).to.be.false;
// 		expect(barLogger.enabled).to.be.true;
// 		instance.log('log() test');
// 		fooLogger.log('foo log() test');
// 		barLogger.log('bar log() test');
// 		expect(count).to.equal(2);

// 		instance.enable('foo*,-*bar');

// 		count = 0;
// 		expect(fooLogger.enabled).to.be.true;
// 		expect(barLogger.enabled).to.be.false;
// 		instance.log('log() test');
// 		fooLogger.log('foo log() test');
// 		barLogger.log('bar log() test');
// 		expect(count).to.equal(2);

// 		instance.enable(/^foo/);

// 		count = 0;
// 		expect(fooLogger.enabled).to.be.true;
// 		expect(barLogger.enabled).to.be.true;
// 		instance.log('log() test');
// 		fooLogger.log('foo log() test');
// 		barLogger.log('bar log() test');
// 		expect(count).to.equal(3);
// 	});

// 	it('should emit messages even if not enabled', () => {
// 		let streamCount = 0;

// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				streamCount++;
// 				cb();
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.enable(null)
// 			.pipe(new MockOutputStream);

// 		let emitCount = 0;

// 		const onsnoop = msg => {
// 			expect(msg).to.be.an('object');
// 			expect(msg.id).to.equal(instance._id);

// 			if (emitCount === 0) {
// 				expect(msg.args).to.deep.equal([ 'foo' ]);
// 			} else if (emitCount === 1) {
// 				expect(msg.args).to.deep.equal([ 'bar %s', 'baz' ]);
// 			}
// 			emitCount++;
// 		};
// 		process.on('snooplogg', onsnoop);

// 		try {
// 			instance.log('foo');
// 			expect(emitCount).to.equal(1);

// 			instance.log('bar %s', 'baz');
// 			expect(emitCount).to.equal(2);

// 			expect(streamCount).to.equal(0);
// 		} finally {
// 			process.removeListener('snooplogg', onsnoop);
// 		}
// 	});

// 	it('should invoke middleware', () => {
// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				try {
// 					expect(msg.toString()).to.equal('test log()\n');
// 					cb();
// 				} catch (e) {
// 					cb(e);
// 				}
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.config({ theme: 'minimal' })
// 			.enable('*')
// 			.use(msg => {
// 				msg.args[0] = msg.args[0].split(' ').reverse().join(' ');
// 			})
// 			.pipe(new MockOutputStream)
// 			.log('log() test');

// 		expect(() => {
// 			instance.use();
// 		}).to.throw(TypeError, 'Expected middleware to be a function');

// 		expect(() => {
// 			instance.use(123);
// 		}).to.throw(TypeError, 'Expected middleware to be a function');

// 		expect(() => {
// 			instance.use('bar');
// 		}).to.throw(TypeError, 'Expected middleware to be a function');

// 		expect(() => {
// 			instance.use(()=>{}, 'foo');
// 		}).to.throw(TypeError, 'Expected priority to be a number');
// 	});

// 	it('should fallback to standard message output if theme is invalid', () => {
// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				try {
// 					expect(msg.toString()).to.equal('log() test\n');
// 					cb();
// 				} catch (e) {
// 					cb(e);
// 				}
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.config({ theme: 'foo' })
// 			.enable('*')
// 			.pipe(new MockOutputStream)
// 			.log('log() test');
// 	});

// 	it('should invoke middleware with priorities', () => {
// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				try {
// 					expect(msg.toString()).to.equal('test312\n');
// 					cb();
// 				} catch (e) {
// 					cb(e);
// 				}
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.config({ theme: 'minimal' })
// 			.enable('*')
// 			.use(msg => {
// 				msg.args[0] = msg.args[0] + '1';
// 			})
// 			.use(msg => {
// 				msg.args[0] = msg.args[0] + '2';
// 			}, -1)
// 			.use(msg => {
// 				msg.args[0] = msg.args[0] + '3';
// 			}, 1)
// 			.pipe(new MockOutputStream)
// 			.log('test');
// 	});

// 	it('should buffer messages', () => {
// 		const instance = createInstanceWithDefaults()
// 			.config({ maxBufferSize: 10 })
// 			.enable('*');

// 		expect(instance._buffer.size).to.equal(0);
// 		expect(instance._buffer.maxSize).to.equal(10);

// 		let i = 1;

// 		for (; i <= 10; i++) {
// 			instance.log('foo' + i);
// 			expect(instance._buffer.size).to.equal(i);
// 		}

// 		for (; i <= 23; i++) {
// 			instance.log('foo' + i);
// 			expect(instance._buffer.size).to.equal(10);
// 		}
// 	});

// 	it('should add a new logger type', () => {
// 		let count = 0;

// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				count++;
// 				expect(msg.toString()).to.equal('foo foo() test\n');
// 				cb();
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.enable('*')
// 			.pipe(new MockOutputStream)
// 			.type('foo')
// 			.foo('foo() test');

// 		expect(count).to.equal(1);

// 		expect(() => {
// 			instance.type();
// 		}).to.throw(TypeError, 'Expected name to be a non-empty string');

// 		expect(() => {
// 			instance.type('bar', 'baz');
// 		}).to.throw(TypeError, 'Expected opts to be an object');
// 	});

// 	it('should snoop on other instances', () => {
// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				expect(msg.toString()).to.equal('test!\n');
// 				cb();
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.enable('*')
// 			.pipe(new MockOutputStream)
// 			.snoop();

// 		try {
// 			createInstanceWithDefaults()
// 				.log('test!');
// 		} finally {
// 			instance.unsnoop();
// 		}
// 	});

// 	it('should snoop on other instances with namespace prefix', () => {
// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				expect(msg.toString()).to.equal('\u001b[31mfoo:\u001b[39m test!\n');
// 				cb();
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.config({ colors: [ 'red' ] })
// 			.enable('*')
// 			.pipe(new MockOutputStream)
// 			.snoop('foo:');

// 		try {
// 			createInstanceWithDefaults()
// 				.log('test!');
// 		} finally {
// 			instance.unsnoop();
// 		}
// 	});

// 	it('should fail if snoop namespace prefix is not a string', () => {
// 		expect(() => {
// 			createInstanceWithDefaults().snoop(123);
// 		}).to.throw(TypeError, 'Expected namespace prefix to be a string');
// 	});

// 	it('should error if invalid pipe or unpipe params', () => {
// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				cb();
// 			}
// 		}

// 		const instance = createInstanceWithDefaults();

// 		expect(() => {
// 			instance.pipe();
// 		}).to.throw(TypeError, 'Invalid stream');

// 		expect(() => {
// 			instance.pipe(null);
// 		}).to.throw(TypeError, 'Invalid stream');

// 		expect(() => {
// 			instance.pipe(new MockOutputStream, 'foo');
// 		}).to.throw(TypeError, 'Expected options to be an object');

// 		expect(() => {
// 			instance.unpipe();
// 		}).to.throw(TypeError, 'Invalid stream');

// 		expect(() => {
// 			instance.unpipe(null);
// 		}).to.throw(TypeError, 'Invalid stream');
// 	});

// 	it('should flush buffer to stream', () => {
// 		let count = 0;

// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				if (typeof msg === 'string' || msg instanceof Buffer) {
// 					count++;
// 				}
// 				cb();
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.enable('*')
// 			.config({ maxBufferSize: 10 });

// 		for (let i = 0; i < 10; i++) {
// 			instance.log(`foo${i}`);
// 		}

// 		const stream = new MockOutputStream;
// 		instance.pipe(stream, { flush: true });
// 		expect(count).to.equal(10);
// 		instance.pipe(stream, { flush: true });
// 		expect(count).to.equal(10);

// 		count = 0;
// 		instance.pipe(new MockOutputStream, { flush: true, theme: 'detailed' });
// 		expect(count).to.equal(10);

// 		class MockOutputObjectStream extends Writable {
// 			_write(msg, enc, cb) {
// 				if (typeof msg === 'object') {
// 					count++;
// 				}
// 				cb();
// 			}
// 		}

// 		count = 0;
// 		instance.pipe(new MockOutputObjectStream({ objectMode: true }), { flush: true });
// 		expect(count).to.equal(10);
// 	});

// 	it('should flush buffered snooped messages', () => {
// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				expect(msg.toString()).to.match(/^\u001b\[[0-9;]+mfoo\u001b\[39m test!\n$/);
// 				cb();
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.config({
// 				colors: [ 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow' ],
// 				maxBufferSize: 10
// 			})
// 			.enable('*')
// 			.snoop();

// 		const instance2 = createInstanceWithDefaults().enable();
// 		const log = instance2('foo');

// 		log.log('test!');

// 		instance.pipe(new MockOutputStream, { flush: true });

// 		try {
// 			log('test!');
// 		} finally {
// 			instance.unsnoop();
// 		}
// 	});

// 	it('should unpipe a stream', () => {
// 		let count = 0;

// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				count++;
// 				cb();
// 			}
// 		}

// 		const stream = new MockOutputStream;
// 		const instance = createInstanceWithDefaults()
// 			.enable('*')
// 			.pipe(stream);

// 		instance.log('foo');
// 		instance.log('bar');

// 		expect(count).to.equal(2);

// 		instance.unpipe(stream);
// 		instance.log('baz');
// 		instance.log('wiz');

// 		expect(count).to.equal(2);
// 	});

// 	it('should error if dispatch is passed a malformed message', () => {
// 		const instance = createInstanceWithDefaults()
// 			.enable('*')
// 			.snoop();

// 		expect(() => {
// 			process.emit('snooplogg', { foo: 'bar' });
// 		}).to.throw(TypeError, 'Expected args to be an array');

// 		instance.unsnoop();
// 	});

// 	it('should expose chalk', () => {
// 		const instance = createInstanceWithDefaults();
// 		expect(instance.chalk).to.be.an('function');
// 	});

// 	it('should log to objectMode stream', () => {
// 		let count = 0;

// 		class MockOutputObjectStream extends Writable {
// 			_write(msg, enc, cb) {
// 				if (typeof msg === 'object') {
// 					count++;
// 				}
// 				cb();
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.enable('*')
// 			.pipe(new MockOutputObjectStream({ objectMode: true }))
// 			.log('foo')
// 			.log('bar');

// 		expect(count).to.equal(2);
// 	});

// 	it('should strip colors', () => {
// 		class MockOutputStream extends Transform {
// 			_transform(msg, enc, cb) {
// 				this.push(msg);
// 				cb();
// 			}
// 		}

// 		class MockOutputStringStream extends Writable {
// 			_write(msg, enc, cb) {
// 				expect(msg.toString()).to.equal('hello world\n');
// 				cb();
// 			}
// 		}

// 		const stream = new MockOutputStream();
// 		const streamStripColors = new StripColors;
// 		stream.pipe(streamStripColors);
// 		streamStripColors.pipe(new MockOutputStringStream);

// 		const objStream = new Format();
// 		const objStreamStripColors = new StripColors;
// 		objStream.pipe(objStreamStripColors);
// 		objStreamStripColors.pipe(new MockOutputStringStream);

// 		const instance = createInstanceWithDefaults()
// 			.enable('*')
// 			.pipe(stream)
// 			.pipe(objStream);

// 		instance.log('hello ' + instance.chalk.red('world'));
// 	});

// 	it('should log with built-in detailed theme', () => {
// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				try {
// 					expect(msg).to.be.instanceof(Buffer);
// 					expect(msg.toString()).to.match(/log\(\) test\n$/);
// 					cb();
// 				} catch (e) {
// 					cb(e);
// 				}
// 			}
// 		}

// 		createInstanceWithDefaults()
// 			.config({
// 				colors: [ 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow' ],
// 				theme: 'detailed'
// 			})
// 			.enable('*')
// 			.pipe(new MockOutputStream)
// 			.log('log() test');

// 		class MockOutputTypeStream extends Writable {
// 			_write(msg, enc, cb) {
// 				try {
// 					expect(msg).to.be.instanceof(Buffer);
// 					expect(msg.toString()).to.match(/^\u001b\[[0-9;]+m\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\u001b\[39m \u001b\[[0-9;]+minfo\u001b\[39m info\(\) test\n$/);
// 					cb();
// 				} catch (e) {
// 					cb(e);
// 				}
// 			}
// 		}

// 		createInstanceWithDefaults()
// 			.config({
// 				colors: [ 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow' ],
// 				theme: 'detailed'
// 			})
// 			.enable('*')
// 			.pipe(new MockOutputTypeStream)
// 			.info('info() test');

// 		class MockNamespacedOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				try {
// 					expect(msg).to.be.instanceof(Buffer);
// 					expect(msg.toString()).to.match(/\u001b\[[0-9;]+mfoo\u001b\[39m foo\(\) test\n$/);
// 					cb();
// 				} catch (e) {
// 					cb(e);
// 				}
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.config({
// 				colors: [ 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow' ],
// 				theme: 'detailed'
// 			})
// 			.enable('*')
// 			.pipe(new MockNamespacedOutputStream);

// 		const foo = instance('foo');
// 		foo.log('foo() test');
// 	});

// 	it('should fail to auto pick color and fallback to built-in colors', () => {
// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				try {
// 					expect(msg).to.be.instanceof(Buffer);
// 					expect(msg.toString()).to.match(/^\u001b\[[0-9;]+mfoo\u001b\[39m bar!\n$/);
// 					cb();
// 				} catch (e) {
// 					cb(e);
// 				}
// 			}
// 		}

// 		const instance = createInstanceWithDefaults()
// 			.config({
// 				minBrightness: 255,
// 				maxBrightness: 255,
// 				theme: 'standard'
// 			})
// 			.enable('*')
// 			.pipe(new MockOutputStream);

// 		const fooLogger = instance('foo');

// 		fooLogger.log('bar!');
// 	});

// 	it('should explicitly create a namespaced logger', () => {
// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				try {
// 					expect(msg).to.be.instanceof(Buffer);
// 					expect(msg.toString()).to.match(/^\u001b\[[0-9;]+mfoo\u001b\[39m log\(\) test\n$/);
// 					cb();
// 				} catch (e) {
// 					cb(e);
// 				}
// 			}
// 		}

// 		createInstanceWithDefaults()
// 			.config({ theme: 'standard' })
// 			.enable('*')
// 			.pipe(new MockOutputStream)
// 			.ns('foo')
// 			.log('log() test');
// 	});

// 	it('should colorize JSON objects', () => {
// 		class MockOutputStream extends Writable {
// 			_write(msg, enc, cb) {
// 				try {
// 					expect(msg).to.be.instanceof(Buffer);

// 					if (parseInt(process.versions.node) >= 10) {
// 						expect(msg.toString()).to.match(/^{\s+foo:\s+\u001b\[32m'bar'\u001b\[39m,\s+baz:\s+\u001b\[33m123\u001b\[39m,\s+undef:\s+\u001b\[90mundefined\u001b\[39m\s+}\n$/);
// 					} else {
// 						expect(msg.toString()).to.equal('{ foo: \u001b[32m\'bar\'\u001b[39m,\n  baz: \u001b[33m123\u001b[39m,\n  undef: \u001b[90mundefined\u001b[39m }\n');
// 					}

// 					cb();
// 				} catch (e) {
// 					cb(e);
// 				}
// 			}
// 		}

// 		createInstanceWithDefaults()
// 			.config({ theme: 'standard' })
// 			.enable('*')
// 			.pipe(new MockOutputStream)
// 			.log({
// 				foo: 'bar',
// 				baz: 123,
// 				undef: undefined
// 			});
// 	});

// 	it('should return a console instance for the top-level instance', () => {
// 		const c = createInstanceWithDefaults().console;
// 		expect(c).to.be.instanceof(Console);
// 	});

// 	it('should return a console instance for the namespace logger', () => {
// 		const c = createInstanceWithDefaults()('foo').console;
// 		expect(c).to.be.instanceof(Console);
// 	});

// 	it('should allow log functions to be destructured', () => {
// 		const { log } = snooplogg;
// 		log('foo!');
// 	});

// 	it('should allow namespaced log functions to be destructured', () => {
// 		const { log } = snooplogg('foo');
// 		log('bar!');
// 	});

// 	it('should not clobber instance specific prototypes', () => {
// 		const logger1 = new SnoopLogg();

// 		expect(logger1._id).to.equal(logger1.__id);

// 		const logger2 = new SnoopLogg();

// 		expect(logger1._id).to.equal(logger1.__id);
// 		expect(logger2._id).to.equal(logger2.__id);

// 		const logger1ns = logger1('foo');

// 		expect(logger1ns._root._id).to.equal(logger1._id);
// 		expect(logger1ns._root.__id).to.equal(logger1ns.__id);
// 	});
