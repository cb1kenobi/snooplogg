import SnoopLogg, { info, debug } from '../src/index';
import * as local from '../src/index';

SnoopLogg.stdio.info('hi from global info!');
info('hi from global info again!');

const log = SnoopLogg('foo');
log.info('hi from foo info!');

SnoopLogg.type('foo');
SnoopLogg.foo('shibby');
log.foo('far out');

const barlog = log('bar');
barlog.warn('sweet!');

SnoopLogg.debug('this is a debug log message');

debug('this is a debug log message');

// describe('SnoopLogg', () => {
// 	it('should log to stream', done => {
// 		const stream = new PassThrough();
// 		let result = '';
//
// 		stream.on('data', chunk => {
// 			console.log(chunk);
// 			result = chunk;
// 		});
// 		stream.on('end', () => {
// 			expect(result).to.equal('hi');
// 			done();
// 		});
//
// 		SnoopLogg.pipe(stream);
// 		SnoopLogg.info('hi');
// 	});
//
// 	// logging Error stack
// });
