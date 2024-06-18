import { format } from 'node:util';
import snooplogg, { info, log } from '../dist/index.js';

console.log('Welcome to SnoopLogg demo!\n');

log("Congratulations! You've activated SnoopLogg!\n");

log(`You can log simple messages like this or print objects:
|  import { log } from 'snooplogg';
|  log({ foo: 'bar', baz: 123 });`);
log({ foo: 'bar', baz: 123 });

log(`
In addition to log(), SnoopLogg provides these methods:
|  import { trace, debug, info, warn, error, panic } from 'snooplogg';`);
for (const method of ['trace', 'debug', 'info', 'warn', 'error', 'panic']) {
	snooplogg[method](`This is a ${method}() message`);
}

log(`
SnoopLogg allows you to create nested loggers:
|  const http = snooplogg('http');
|  http.info('Listening on port 80');
|  http.debug('Connection accepted');`);
const http = snooplogg('http');
http.info('Listening on port 80');
http.debug('Connection accepted');

log(`
You can also have deeply nested loggers:
|  const foo = snooplogg('foo');
|  const bar = foo('bar');
|  const baz = bar('baz');
|  baz.info('Hello, world!');`);
const foo = snooplogg('foo');
const bar = foo('bar');
const baz = bar('baz');
baz.info('Hello, world!');

log(`
You can customize the log message format:
|  snooplogg.config({
|    format({ args, method }) {
|      return \`$\{elements.timestamp(ts, styles)\}  <\${method}> \${format(...args)}\`;
|    }
|  });
|  info('This is a custom message format with timestamp');`);
snooplogg.config({
	format({ args, elements, method, ts }, styles) {
		return `${elements.timestamp(ts, styles)} <${method}>${format(...args)}</${method}>`;
	}
});
info('This is a custom message format with timestamp');
snooplogg.config({ format: null });

log(`
Logging errors is easy!
|  log(new SyntaxError('This is just a test'));`);
log(new SyntaxError('This is just a test'));

log(`
SnoopLogg lets you pipe the logs to any writable stream such a file:
|  snooplogg.pipe(fs.createWriteStream('app.log'));
|  info('This message will be written to app.log');

`);

// snoop

if (!process.env.SNOOPLOGG && !process.env.DEBUG) {
	console.log('Try running: SNOOPLOGG=* node demo.js');
}
