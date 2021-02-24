import snooplogg from '../src/index.js';
import util from 'util';
import { expect } from 'chai';
import {
	createInstanceWithDefaults,
	Format,
	SnoopLogg,
	StripColors
} from '../src/index.js';

import { Console } from 'console';
import { Transform, Writable } from 'stream';

describe('SnoopLogg', () => {
	before(() => {
		// silence stdio
		snooplogg.enable(null);
	});

	it('should be instance of SnoopLogg', () => {
		expect(snooplogg).to.be.a('function');
	});

	it('should error if SnoopLogg options are invalid', () => {
		expect(() => {
			new SnoopLogg('foo');
		}).to.throw(TypeError, 'Expected options to be an object');

		expect(() => {
			new SnoopLogg(null);
		}).to.throw(TypeError, 'Expected options to be an object');
	});

	it('should update config', () => {
		const instance = createInstanceWithDefaults();

		instance.config();

		expect(() => {
			instance.config('foo');
		}).to.throw(TypeError, 'Expected config options to be an object');

		expect(() => {
			instance.config({
				colors: 123
			});
		}).to.throw(TypeError, 'Expected colors to be a string or array');

		instance.config({
			colors: 'red,blue'
		});

		instance.config({
			colors: [ 'green', 'yellow' ]
		});

		expect(() => {
			instance.config({
				inspectOptions: 'foo'
			});
		}).to.throw(TypeError, 'Expected inspect options to be an object');

		expect(() => {
			instance.config({
				minBrightness: 'foo'
			});
		}).to.throw(TypeError, 'Expected minimum brightness to be a number');

		expect(() => {
			instance.config({
				minBrightness: -1
			});
		}).to.throw(RangeError, 'Minimum brightness must be between 0 and 255');

		expect(() => {
			instance.config({
				minBrightness: 666
			});
		}).to.throw(RangeError, 'Minimum brightness must be between 0 and 255');

		expect(() => {
			instance.config({
				maxBrightness: 'foo'
			});
		}).to.throw(TypeError, 'Expected maximum brightness to be a number');

		expect(() => {
			instance.config({
				maxBrightness: -1
			});
		}).to.throw(RangeError, 'Maximum brightness must be between 0 and 255');

		expect(() => {
			instance.config({
				maxBrightness: 666
			});
		}).to.throw(RangeError, 'Maximum brightness must be between 0 and 255');

		expect(() => {
			instance.config({
				minBrightness: 100,
				maxBrightness: 50
			});
		}).to.throw(RangeError, 'Maximum brightness must greater than or equal to the minimum brightness');

		expect(() => {
			instance.config({
				theme: 123
			});
		}).to.throw(TypeError, 'Expected theme to be a string');

		instance.config({
			theme: 'foo'
		});

		expect(() => {
			instance.config({
				maxBufferSize: 'hi'
			});
		}).to.throw(TypeError, 'Invalid max buffer size: Expected new max size to be a number');

		expect(() => {
			instance.config({
				maxBufferSize: NaN
			});
		}).to.throw(RangeError, 'Invalid max buffer size: Expected new max size to be zero or greater');

		expect(() => {
			instance.config({
				maxBufferSize: -123
			});
		}).to.throw(RangeError, 'Invalid max buffer size: Expected new max size to be zero or greater');
	});

	it('should log to stream', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.equal('log() test\n');
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		createInstanceWithDefaults()
			.config({ theme: 'minimal' })
			.enable('*')
			.pipe(new MockOutputStream)
			.log('log() test');
	});

	it('should output log types', () => {
		const types = [ 'trace', 'debug', 'info', 'warn', 'error', 'fatal' ];
		const expected = [
			/^\u001b\[90mtrace\u001b\[39m Trace: trace\(\) test\n/,
			'\u001b[35mdebug\u001b[39m debug() test\n',
			'\u001b[32minfo\u001b[39m info() test\n',
			'\u001b[33mwarn\u001b[39m warn() test\n',
			'\u001b[31merror\u001b[39m error() test\n',
			'\u001b[41m\u001b[37mfatal\u001b[39m\u001b[49m fatal() test\n'
		];
		let i = 0;

		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					const value = expected[i++];
					if (value instanceof RegExp) {
						expect(msg.toString()).to.match(value);
					} else {
						expect(msg.toString()).to.equal(value);
					}
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		const inst = createInstanceWithDefaults()
			.config({ theme: 'standard' })
			.enable('*')
			.pipe(new MockOutputStream);

		for (const type of types) {
			inst[type](`${type}() test`);
		}
	});

	it('should log errors with stacktraces', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.match(/Error: Oh no/);
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		createInstanceWithDefaults()
			.config({ theme: 'minimal' })
			.enable('*')
			.pipe(new MockOutputStream)
			.log(new Error('Oh no'));
	});

	it('should log with namespaced logger', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.equal('foo log() test\n');
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		const out = new StripColors;
		out.pipe(new MockOutputStream);

		const instance = createInstanceWithDefaults()
			.config({
				colors: [ 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow' ],
				theme: 'standard'
			})
			.enable('*')
			.pipe(out);

		const fooLogger = instance('foo');

		fooLogger.log('log() test');
	});

	it('should log with nested namespaced logger', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.equal('foo:bar log() test\n');
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		const out = new StripColors;
		out.pipe(new MockOutputStream);

		const instance = createInstanceWithDefaults()
			.config({
				colors: [ 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow' ],
				theme: 'standard'
			})
			.enable('*')
			.pipe(out);

		const fooLogger = instance('foo');
		const barLogger = fooLogger('bar');

		barLogger.log('log() test');

		expect(fooLogger.namespace).to.equal('foo');
		expect(barLogger.namespace).to.equal('foo:bar');
	});

	it('should get logger namespace', () => {
		const instance = createInstanceWithDefaults();
		const fooLogger = instance('foo');
		const barLogger = fooLogger('bar');

		expect(instance.namespace).to.be.null;
		expect(fooLogger.namespace).to.equal('foo');
		expect(barLogger.namespace).to.equal('foo:bar');
	});

	it('should cache namespace loggers', () => {
		const instance = createInstanceWithDefaults();

		const fooLogger = instance('foo');
		expect(fooLogger).to.equal(instance('foo'));
		expect(fooLogger).to.equal(instance.ns('foo'));

		const barLogger = fooLogger('bar');
		expect(barLogger).to.equal(fooLogger('bar'));
	});

	it('should throw error when trying to enable bad patterns', () => {
		const instance = createInstanceWithDefaults();

		expect(() => {
			instance.enable(123);
		}).to.throw(TypeError, 'Expected pattern to be a string or regex');
	});

	it('should filter messages', () => {
		let count = 0;

		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				count++;
				cb();
			}
		}

		const instance = createInstanceWithDefaults()
			.enable(null)
			.pipe(new MockOutputStream);

		const fooLogger = instance('foo');
		const barLogger = fooLogger('bar');

		expect(fooLogger.enabled).to.be.false;
		expect(barLogger.enabled).to.be.false;
		instance.log('log() test');
		fooLogger.log('foo log() test');
		barLogger.log('bar log() test');
		expect(count).to.equal(0);

		instance.enable('*');

		count = 0;
		expect(fooLogger.enabled).to.be.true;
		expect(barLogger.enabled).to.be.true;
		instance.log('log() test');
		fooLogger.log('foo log() test');
		barLogger.log('bar log() test');
		expect(count).to.equal(3);

		instance.enable('foo');

		count = 0;
		expect(fooLogger.enabled).to.be.true;
		expect(barLogger.enabled).to.be.false;
		instance.log('log() test');
		fooLogger.log('foo log() test');
		barLogger.log('bar log() test');
		expect(count).to.equal(2);

		instance.enable('foo*');

		count = 0;
		expect(fooLogger.enabled).to.be.true;
		expect(barLogger.enabled).to.be.true;
		instance.log('log() test');
		fooLogger.log('foo log() test');
		barLogger.log('bar log() test');
		expect(count).to.equal(3);

		instance.enable('bar');

		count = 0;
		expect(fooLogger.enabled).to.be.false;
		expect(barLogger.enabled).to.be.false;
		instance.log('log() test');
		fooLogger.log('foo log() test');
		barLogger.log('bar log() test');
		expect(count).to.equal(1);

		instance.enable('*bar');

		count = 0;
		expect(fooLogger.enabled).to.be.false;
		expect(barLogger.enabled).to.be.true;
		instance.log('log() test');
		fooLogger.log('foo log() test');
		barLogger.log('bar log() test');
		expect(count).to.equal(2);

		instance.enable('foo*,-*bar');

		count = 0;
		expect(fooLogger.enabled).to.be.true;
		expect(barLogger.enabled).to.be.false;
		instance.log('log() test');
		fooLogger.log('foo log() test');
		barLogger.log('bar log() test');
		expect(count).to.equal(2);

		instance.enable(/^foo/);

		count = 0;
		expect(fooLogger.enabled).to.be.true;
		expect(barLogger.enabled).to.be.true;
		instance.log('log() test');
		fooLogger.log('foo log() test');
		barLogger.log('bar log() test');
		expect(count).to.equal(3);
	});

	it('should expose colors api', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.equal('the \u001b[31mred\u001b[39m car\n');
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		const instance = createInstanceWithDefaults()
			.config({ theme: 'minimal' })
			.enable('*')
			.pipe(new MockOutputStream);

		instance.log(`the ${instance.chalk.red('red')} car`);
	});

	it('should use a custom theme', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.equal('**FOO** themes rock\n');
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		const instance = createInstanceWithDefaults()
			.theme('foo', function (msg) {
				return `**FOO** ${util.format.apply(null, msg.args)}\n`;
			})
			.config({ theme: 'foo' })
			.enable('*')
			.pipe(new MockOutputStream)
			.log('themes rock');

		expect(() => {
			instance.theme();
		}).to.throw(TypeError, 'Expected name to be a string');

		expect(() => {
			instance.theme(123);
		}).to.throw(TypeError, 'Expected name to be a string');

		expect(() => {
			instance.theme('bar');
		}).to.throw(TypeError, 'Expected fn to be a function');

		expect(() => {
			instance.theme('bar', 'baz');
		}).to.throw(TypeError, 'Expected fn to be a function');
	});

	it('should use a custom theme for a specific piped stream', () => {
		class MockMinimalOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.equal('themes rock\n');
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		class MockFooOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.equal('**FOO** themes rock\n');
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		createInstanceWithDefaults()
			.theme('foo', function (msg) {
				return `**FOO** ${util.format.apply(null, msg.args)}\n`;
			})
			.config({ theme: 'minimal' })
			.enable('*')
			.pipe(new MockMinimalOutputStream)
			.pipe(new MockFooOutputStream, { theme: 'foo' })
			.log('themes rock');
	});

	it('should styles to text', () => {
		const instance = createInstanceWithDefaults()
			.config({
				colors: [ 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow' ]
			})
			.style('reverse', s => s.split('').reverse().join(''));

		expect(instance.styles.red('hello')).to.equal('\u001b[31mhello\u001b[39m');

		expect(instance.styles.uppercase('HeLlO')).to.equal('HELLO');
		expect(instance.styles.lowercase('HeLlO')).to.equal('hello');
		expect(instance.styles.bracket('hello')).to.equal('[hello]');
		expect(instance.styles.paren('hello')).to.equal('(hello)');
		expect(instance.styles.auto('hello')).to.equal('\u001b[31mhello\u001b[39m');

		expect(instance.styles.reverse('HeLlO')).to.equal('OlLeH');

		expect(instance.applyStyle('uppercase,reverse', 'HeLlO')).to.equal('OLLEH');
		expect(instance.applyStyle('uppercase,red,bold', 'HeLlO')).to.equal('\u001b[1m\u001b[31mHELLO\u001b[39m\u001b[22m');

		expect(instance.applyStyle('foo', 'HeLlO')).to.equal('HeLlO');

		expect(() => {
			instance.style();
		}).to.throw(TypeError, 'Expected name to be a string');

		expect(() => {
			instance.style(123);
		}).to.throw(TypeError, 'Expected name to be a string');

		expect(() => {
			instance.style('bar');
		}).to.throw(TypeError, 'Expected fn to be a function');

		expect(() => {
			instance.style('bar', 'baz');
		}).to.throw(TypeError, 'Expected fn to be a function');
	});

	it('should emit messages even if not enabled', () => {
		let streamCount = 0;

		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				streamCount++;
				cb();
			}
		}

		const instance = createInstanceWithDefaults()
			.enable(null)
			.pipe(new MockOutputStream);

		let emitCount = 0;

		const onsnoop = msg => {
			expect(msg).to.be.an('object');
			expect(msg.id).to.equal(instance._id);

			if (emitCount === 0) {
				expect(msg.args).to.deep.equal([ 'foo' ]);
			} else if (emitCount === 1) {
				expect(msg.args).to.deep.equal([ 'bar %s', 'baz' ]);
			}
			emitCount++;
		};
		process.on('snooplogg', onsnoop);

		try {
			instance.log('foo');
			expect(emitCount).to.equal(1);

			instance.log('bar %s', 'baz');
			expect(emitCount).to.equal(2);

			expect(streamCount).to.equal(0);
		} finally {
			process.removeListener('snooplogg', onsnoop);
		}
	});

	it('should invoke middleware', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg.toString()).to.equal('test log()\n');
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		const instance = createInstanceWithDefaults()
			.config({ theme: 'minimal' })
			.enable('*')
			.use(msg => {
				msg.args[0] = msg.args[0].split(' ').reverse().join(' ');
			})
			.pipe(new MockOutputStream)
			.log('log() test');

		expect(() => {
			instance.use();
		}).to.throw(TypeError, 'Expected middleware to be a function');

		expect(() => {
			instance.use(123);
		}).to.throw(TypeError, 'Expected middleware to be a function');

		expect(() => {
			instance.use('bar');
		}).to.throw(TypeError, 'Expected middleware to be a function');

		expect(() => {
			instance.use(()=>{}, 'foo');
		}).to.throw(TypeError, 'Expected priority to be a number');
	});

	it('should fallback to standard message output if theme is invalid', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg.toString()).to.equal('log() test\n');
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		const instance = createInstanceWithDefaults()
			.config({ theme: 'foo' })
			.enable('*')
			.pipe(new MockOutputStream)
			.log('log() test');
	});

	it('should invoke middleware with priorities', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg.toString()).to.equal('test312\n');
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		const instance = createInstanceWithDefaults()
			.config({ theme: 'minimal' })
			.enable('*')
			.use(msg => {
				msg.args[0] = msg.args[0] + '1';
			})
			.use(msg => {
				msg.args[0] = msg.args[0] + '2';
			}, -1)
			.use(msg => {
				msg.args[0] = msg.args[0] + '3';
			}, 1)
			.pipe(new MockOutputStream)
			.log('test');
	});

	it('should buffer messages', () => {
		const instance = createInstanceWithDefaults()
			.config({ maxBufferSize: 10 })
			.enable('*');

		expect(instance._buffer.size).to.equal(0);
		expect(instance._buffer.maxSize).to.equal(10);

		let i = 1;

		for (; i <= 10; i++) {
			instance.log('foo' + i);
			expect(instance._buffer.size).to.equal(i);
		}

		for (; i <= 23; i++) {
			instance.log('foo' + i);
			expect(instance._buffer.size).to.equal(10);
		}
	});

	it('should add a new logger type', () => {
		let count = 0;

		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				count++;
				expect(msg.toString()).to.equal('foo foo() test\n');
				cb();
			}
		}

		const instance = createInstanceWithDefaults()
			.enable('*')
			.pipe(new MockOutputStream)
			.type('foo')
			.foo('foo() test');

		expect(count).to.equal(1);

		expect(() => {
			instance.type();
		}).to.throw(TypeError, 'Expected name to be a non-empty string');

		expect(() => {
			instance.type('bar', 'baz');
		}).to.throw(TypeError, 'Expected opts to be an object');
	});

	it('should snoop on other instances', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				expect(msg.toString()).to.equal('test!\n');
				cb();
			}
		}

		const instance = createInstanceWithDefaults()
			.enable('*')
			.pipe(new MockOutputStream)
			.snoop();

		try {
			createInstanceWithDefaults()
				.log('test!');
		} finally {
			instance.unsnoop();
		}
	});

	it('should snoop on other instances with namespace prefix', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				expect(msg.toString()).to.equal('\u001b[31mfoo:\u001b[39m test!\n');
				cb();
			}
		}

		const instance = createInstanceWithDefaults()
			.config({ colors: [ 'red' ] })
			.enable('*')
			.pipe(new MockOutputStream)
			.snoop('foo:');

		try {
			createInstanceWithDefaults()
				.log('test!');
		} finally {
			instance.unsnoop();
		}
	});

	it('should fail if snoop namespace prefix is not a string', () => {
		expect(() => {
			createInstanceWithDefaults().snoop(123);
		}).to.throw(TypeError, 'Expected namespace prefix to be a string');
	});

	it('should error if invalid pipe or unpipe params', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				cb();
			}
		}

		const instance = createInstanceWithDefaults();

		expect(() => {
			instance.pipe();
		}).to.throw(TypeError, 'Invalid stream');

		expect(() => {
			instance.pipe(null);
		}).to.throw(TypeError, 'Invalid stream');

		expect(() => {
			instance.pipe(new MockOutputStream, 'foo');
		}).to.throw(TypeError, 'Expected options to be an object');

		expect(() => {
			instance.unpipe();
		}).to.throw(TypeError, 'Invalid stream');

		expect(() => {
			instance.unpipe(null);
		}).to.throw(TypeError, 'Invalid stream');
	});

	it('should flush buffer to stream', () => {
		let count = 0;

		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				if (typeof msg === 'string' || msg instanceof Buffer) {
					count++;
				}
				cb();
			}
		}

		const instance = createInstanceWithDefaults()
			.enable('*')
			.config({ maxBufferSize: 10 });

		for (let i = 0; i < 10; i++) {
			instance.log(`foo${i}`);
		}

		const stream = new MockOutputStream;
		instance.pipe(stream, { flush: true });
		expect(count).to.equal(10);
		instance.pipe(stream, { flush: true });
		expect(count).to.equal(10);

		count = 0;
		instance.pipe(new MockOutputStream, { flush: true, theme: 'detailed' });
		expect(count).to.equal(10);

		class MockOutputObjectStream extends Writable {
			_write(msg, enc, cb) {
				if (typeof msg === 'object') {
					count++;
				}
				cb();
			}
		}

		count = 0;
		instance.pipe(new MockOutputObjectStream({ objectMode: true }), { flush: true });
		expect(count).to.equal(10);
	});

	it('should flush buffered snooped messages', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				expect(msg.toString()).to.match(/^\u001b\[[0-9;]+mfoo\u001b\[39m test!\n$/);
				cb();
			}
		}

		const instance = createInstanceWithDefaults()
			.config({
				colors: [ 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow' ],
				maxBufferSize: 10
			})
			.enable('*')
			.snoop();

		const instance2 = createInstanceWithDefaults().enable();
		const log = instance2('foo');

		log.log('test!');

		instance.pipe(new MockOutputStream, { flush: true });

		try {
			log('test!');
		} finally {
			instance.unsnoop();
		}
	});

	it('should unpipe a stream', () => {
		let count = 0;

		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				count++;
				cb();
			}
		}

		const stream = new MockOutputStream;
		const instance = createInstanceWithDefaults()
			.enable('*')
			.pipe(stream);

		instance.log('foo');
		instance.log('bar');

		expect(count).to.equal(2);

		instance.unpipe(stream);
		instance.log('baz');
		instance.log('wiz');

		expect(count).to.equal(2);
	});

	it('should error if dispatch is passed a malformed message', () => {
		const instance = createInstanceWithDefaults()
			.enable('*')
			.snoop();

		expect(() => {
			process.emit('snooplogg', { foo: 'bar' });
		}).to.throw(TypeError, 'Expected args to be an array');

		instance.unsnoop();
	});

	it('should expose chalk', () => {
		const instance = createInstanceWithDefaults();
		expect(instance.chalk).to.be.an('function');
	});

	it('should log to objectMode stream', () => {
		let count = 0;

		class MockOutputObjectStream extends Writable {
			_write(msg, enc, cb) {
				if (typeof msg === 'object') {
					count++;
				}
				cb();
			}
		}

		const instance = createInstanceWithDefaults()
			.enable('*')
			.pipe(new MockOutputObjectStream({ objectMode: true }))
			.log('foo')
			.log('bar');

		expect(count).to.equal(2);
	});

	it('should strip colors', () => {
		class MockOutputStream extends Transform {
			_transform(msg, enc, cb) {
				this.push(msg);
				cb();
			}
		}

		class MockOutputStringStream extends Writable {
			_write(msg, enc, cb) {
				expect(msg.toString()).to.equal('hello world\n');
				cb();
			}
		}

		const stream = new MockOutputStream();
		const streamStripColors = new StripColors;
		stream.pipe(streamStripColors);
		streamStripColors.pipe(new MockOutputStringStream);

		const objStream = new Format();
		const objStreamStripColors = new StripColors;
		objStream.pipe(objStreamStripColors);
		objStreamStripColors.pipe(new MockOutputStringStream);

		const instance = createInstanceWithDefaults()
			.enable('*')
			.pipe(stream)
			.pipe(objStream);

		instance.log('hello ' + instance.chalk.red('world'));
	});

	it('should log with built-in detailed theme', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.match(/log\(\) test\n$/);
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		createInstanceWithDefaults()
			.config({
				colors: [ 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow' ],
				theme: 'detailed'
			})
			.enable('*')
			.pipe(new MockOutputStream)
			.log('log() test');

		class MockOutputTypeStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.match(/^\u001b\[[0-9;]+m\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\u001b\[39m \u001b\[[0-9;]+minfo\u001b\[39m info\(\) test\n$/);
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		createInstanceWithDefaults()
			.config({
				colors: [ 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow' ],
				theme: 'detailed'
			})
			.enable('*')
			.pipe(new MockOutputTypeStream)
			.info('info() test');

		class MockNamespacedOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.match(/\u001b\[[0-9;]+mfoo\u001b\[39m foo\(\) test\n$/);
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		const instance = createInstanceWithDefaults()
			.config({
				colors: [ 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow' ],
				theme: 'detailed'
			})
			.enable('*')
			.pipe(new MockNamespacedOutputStream);

		const foo = instance('foo');
		foo.log('foo() test');
	});

	it('should fail to auto pick color and fallback to built-in colors', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.match(/^\u001b\[[0-9;]+mfoo\u001b\[39m bar!\n$/);
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		const instance = createInstanceWithDefaults()
			.config({
				minBrightness: 255,
				maxBrightness: 255,
				theme: 'standard'
			})
			.enable('*')
			.pipe(new MockOutputStream);

		const fooLogger = instance('foo');

		fooLogger.log('bar!');
	});

	it('should explicitly create a namespaced logger', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.match(/^\u001b\[[0-9;]+mfoo\u001b\[39m log\(\) test\n$/);
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		createInstanceWithDefaults()
			.config({ theme: 'standard' })
			.enable('*')
			.pipe(new MockOutputStream)
			.ns('foo')
			.log('log() test');
	});

	it('should colorize JSON objects', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);

					if (parseInt(process.versions.node) >= 10) {
						expect(msg.toString()).to.match(/^{\s+foo:\s+\u001b\[32m'bar'\u001b\[39m,\s+baz:\s+\u001b\[33m123\u001b\[39m,\s+undef:\s+\u001b\[90mundefined\u001b\[39m\s+}\n$/);
					} else {
						expect(msg.toString()).to.equal('{ foo: \u001b[32m\'bar\'\u001b[39m,\n  baz: \u001b[33m123\u001b[39m,\n  undef: \u001b[90mundefined\u001b[39m }\n');
					}

					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		createInstanceWithDefaults()
			.config({ theme: 'standard' })
			.enable('*')
			.pipe(new MockOutputStream)
			.log({
				foo: 'bar',
				baz: 123,
				undef: undefined
			});
	});

	it('should return a console instance for the top-level instance', () => {
		const c = createInstanceWithDefaults().console;
		expect(c).to.be.instanceof(Console);
	});

	it('should return a console instance for the namespace logger', () => {
		const c = createInstanceWithDefaults()('foo').console;
		expect(c).to.be.instanceof(Console);
	});

	it('should allow log functions to be destructured', () => {
		const { log } = snooplogg;
		log('foo!');
	});

	it('should allow namespaced log functions to be destructured', () => {
		const { log } = snooplogg('foo');
		log('bar!');
	});

	it('should not clobber instance specific prototypes', () => {
		const logger1 = new SnoopLogg();

		expect(logger1._id).to.equal(logger1.__id);

		const logger2 = new SnoopLogg();

		expect(logger1._id).to.equal(logger1.__id);
		expect(logger2._id).to.equal(logger2.__id);

		const logger1ns = logger1('foo');

		expect(logger1ns._root._id).to.equal(logger1._id);
		expect(logger1ns._root.__id).to.equal(logger1ns.__id);
	});
});
