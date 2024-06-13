import snooplogg, { log } from '../dist/index.js';

console.log('Welcome to SnoopLogg demo!\n');
if (!process.env.SNOOPLOGG && !process.env.DEBUG) {
	console.log('There\'s not much to see here.');
	console.log('Try running: SNOOPLOGG=* node demo.js');
}

log('Congratulations! You\'ve activated SnoopLogg!\n');
log('This is a simple log message. It can be used to output anything like this JSON object:');
log({ foo: 'bar', baz: 123 });
log();

const http = snooplogg('http');
const dispatcher = http('dispatcher');
const worker = snooplogg('worker');

log('MyApp v1.0.0');
http.info('Listening on port 80');

// http.debug('Connection accepted');
// dispatcher.info('GET /');
// worker.log('Connecting to database...');
// worker.log('Found 6 results');

// http.debug('Connection accepted');
// dispatcher.info('GET /auth');
// worker.log('Connecting to database...');
// worker.log('Found 0 results');
// dispatcher.warn('Auth failed');
// http.error('401 Unauthorized');

// snooplogg.panic('App be trippin');

// snooplogg.trace('Oh naw');

// console.log('\n');
