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

// SnoopLogg.stdio.info('hi from global info!');
// info('hi from global info again!');
//
// const log = SnoopLogg('foo');
// log.info('hi from foo info!');
//
// SnoopLogg.type('foo');
// SnoopLogg.foo('shibby');
// log.foo('far out');
//
// const barlog = log('bar');
// barlog.warn('sweet!');
//
// SnoopLogg.debug('this is a debug log message');
//
// debug('this is a debug log message');

describe('SnoopLogg', () => {
	it('should be instance of SnoopLogg', () => {
		expect(snooplogg).to.be.instanceof(SnoopLogg);
		expect(snooplogg).to.be.a.Function;
	});

	it('should log to stream', done => {
		class MockOutputStream extends Writable {
			_write(msg, enc, cb) {
				expect(msg).to.be.instanceof(Buffer);
				expect(msg.toString()).to.equal('log() test\n');
				cb();
			}
		}

		createInstanceWithDefaults({ theme: 'minimal' })
			.config({ theme: 'minimal' })
			.enable(null)
			.pipe(new MockOutputStream)
			.log('log() test');

		done();
	});

	it('should output log types', done => {
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
				expect(msg).to.be.instanceof(Buffer);
				expect(msg.toString()).to.equal(strings[types[i]] + '\n');
				cb();
			}
		}

		const inst = createInstanceWithDefaults({ theme: 'minimal' })
			.config({ theme: 'minimal' })
			.enable(null)
			.pipe(new MockOutputStream);

		for (const type of Object.keys(strings)) {
			inst[type](strings[type]);
		}

		done();
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
