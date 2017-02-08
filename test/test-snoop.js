import snooplogg from '../src/index';

import {
	config,
	createInstanceWithDefaults,
	debug,
	enable,
	error,
	fatal,
	Format,
	info,
	log,
	Logger,
	pipe,
	snoop,
	SnoopLogg,
	StripColors,
	style,
	theme,
	trace,
	type,
	unpipe,
	unsnoop,
	use,
	warn
} from '../src/index';
import { Writable } from 'stream';

import * as local from '../src/index';

snooplogg.stdio;

snooplogg.stdio.info('hi from global info!');
info('hi from global info again!');

const logger = snooplogg('foo');
logger.info('hi from foo info!');

snooplogg.type('foo');
snooplogg.foo('shibby');
logger.foo('far out');

const barlog = logger('bar');
barlog.warn('sweet!');

snooplogg.debug('this is a debug log message');
debug('this is a debug log message');

describe('SnoopLogg', () => {
	before(() => {
		// silence stdio
		snooplogg.enable(null);
	});

	it('should be instance of SnoopLogg', () => {
		expect(snooplogg).to.be.instanceof(SnoopLogg);
		expect(snooplogg).to.be.a.Function;
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
		const strings = {
			trace: 'trace() test',
			debug: 'debug() test',
			info: 'info() test',
			warn: 'warn() test',
			error: 'error() test',
			fatal: 'fatal() test'
		};
		let i = 0;
		const types = Object.keys(strings);

		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.equal(strings[types[i++]] + '\n');
					cb();
				} catch (e) {
					cb(e);
				}
			}
		}

		const inst = createInstanceWithDefaults()
			.config({ theme: 'minimal' })
			.enable('*')
			.pipe(new MockOutputStream);

		for (const type of Object.keys(strings)) {
			inst[type](strings[type]);
		}
	});

	it('should log errors with stacktraces', () => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				try {
					expect(msg).to.be.instanceof(Buffer);
					expect(msg.toString()).to.match(/^Error\: Oh no\n/);
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

	// logging Error stack
	// namespace loggers
	// filtering (enabled)
	// logger enabled flag
	// colors
	// themes
	// styles
	// snooping
	// middleware use()
	// buffer
	// buffer flushing
	// max buffer size
});
