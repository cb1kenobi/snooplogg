'use strict';

console.log('\n\n$ node demo.js')

const snooplogg = require('../dist/index').default;

snooplogg.stdio
	.config({
		//colors: 'cyan,yellow,blue,gray',
		theme: 'detailed'
	});

const http = snooplogg('http');
const dispatcher = http('dispatcher');
const worker = snooplogg('worker');

snooplogg.log('MyApp v1.0.0 ' + snooplogg.chalk.gray('(beta)'));
http.info('Listening on port 80');

http.debug('Connection accepted');
dispatcher.info('GET /');
worker.log('Connecting to database...');
worker.log('Found 6 results');

http.debug('Connection accepted');
dispatcher.info('GET /auth');
worker.log('Connecting to database...');
worker.log('Found 0 results');
dispatcher.warn('Auth failed');
http.error('401 Unauthorized');

snooplogg.fatal('App be trippin');

snooplogg.trace('Oh naw');

console.log('\n');
