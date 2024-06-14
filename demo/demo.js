import { format } from 'node:util';
import ansiStyles from 'ansi-styles';
import snooplogg, { log, info } from '../dist/index.js';

console.log('Welcome to SnoopLogg demo!\n');

log("Congratulations! You've activated SnoopLogg!\n");

log(`You can log simple messages like this or print objects:
  import { log } from 'snooplogg';
  log({ foo: 'bar', baz: 123 });`);
log({ foo: 'bar', baz: 123 });

log(`
In addition to log(), SnoopLogg provides these methods:
  import { trace, debug, info, warn, error, panic } from 'snooplogg';`);
for (const method of ['trace', 'debug', 'info', 'warn', 'error', 'panic']) {
	snooplogg[method](`This is a ${method}() message`);
}

log(`
SnoopLogg allows you to create nested loggers:
  const http = snooplogg('http');
  http.info('Listening on port 80');
  http.debug('Connection accepted');`);
const http = snooplogg('http');
http.info('Listening on port 80');
http.debug('Connection accepted');

log(`
You can also have deeply nested loggers:
  const foo = snooplogg('foo');
  const bar = foo('bar');
  const baz = bar('baz');
  baz.info('Hello, world!');`);
const foo = snooplogg('foo');
const bar = foo('bar');
const baz = bar('baz');
baz.info('Hello, world!');

log(`
You can customize the log message format:
  snooplogg.config({
    format({ args, method }) {
      return \`<\${method}> \${format(...args)}\`;
    }
  });
  info('This is a custom message format');`);
snooplogg.config({
	format({ args, method }) {
		return `<${method}>${format(...args)}</${method}>`;
	}
});
info('This is a custom message format');
snooplogg.config({ format: null });

// const dispatcher = http('dispatcher');
// const worker = snooplogg('worker');

// log('MyApp v1.0.0');
// http.info('Listening on port 80');

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

if (!process.env.SNOOPLOGG && !process.env.DEBUG) {
	console.log('Try running: SNOOPLOGG=* node demo.js');
}
