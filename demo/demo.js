import ansiStyles from 'ansi-styles';
import { format } from 'node:util';
import snooplogg, { info, log, SnoopLogg } from '../dist/index.mjs';

const { cyan, magenta, redBright } = ansiStyles;

console.log(`${magenta.open}Welcome to SnoopLogg demo!${magenta.close}\n`);

if (process.env.SNOOPLOGG_LEVEL) {
	console.log(
		`Filtering by log level ${cyan.open}'${process.env.SNOOPLOGG_LEVEL}'${cyan.close}\n`
	);
}

log("Congratulations! You've activated SnoopLogg!\n");

log(`You can log simple messages like this or print objects:
  ${cyan.open}import { log } from 'snooplogg';${cyan.close}
  ${cyan.open}log({ foo: 'bar', baz: 123 });${cyan.close}`);
log({ foo: 'bar', baz: 123 });

log(`
In addition to log(), SnoopLogg provides these methods:
  ${cyan.open}import { trace, debug, info, warn, error, panic } from 'snooplogg';${cyan.close}`);
for (const method of ['trace', 'debug', 'info', 'warn', 'error', 'panic']) {
	snooplogg[method](`This is a ${method}() message`);
}

log(`
SnoopLogg allows you to create nested loggers:
  ${cyan.open}const http = snooplogg('http');${cyan.close}
  ${cyan.open}http.info('Listening on port 80');${cyan.close}
  ${cyan.open}http.debug('Connection accepted');${cyan.close}`);
const http = snooplogg('http');
http.info('Listening on port 80');
http.debug('Connection accepted');

log(`
You can also have deeply nested loggers:
  ${cyan.open}const foo = snooplogg('foo');${cyan.close}
  ${cyan.open}const bar = foo('bar');${cyan.close}
  ${cyan.open}const baz = bar('baz');${cyan.close}
  ${cyan.open}baz.info('Hello, world!');${cyan.close}`);
const foo = snooplogg('foo');
const bar = foo('bar');
const baz = bar('baz');
baz.info('Hello, world!');

log(`
You can customize the log message format:
  ${cyan.open}snooplogg.config({${cyan.close}
  ${cyan.open}  format({ args, method }) {${cyan.close}
  ${cyan.open}    return \`$\{elements.timestamp(ts, styles)\}  <\${method}> \${format(...args)}\`;${cyan.close}
  ${cyan.open}  }${cyan.close}
  ${cyan.open}});${cyan.close}
  ${cyan.open}info('This is a custom message format with timestamp instead of uptime');${cyan.close}`);
snooplogg.config({
	format({ args, elements, method, ts }, styles) {
		return `${elements.timestamp(ts, styles)} <${method}>${format(...args)}</${method}>`;
	},
});
info('This is a custom message format with timestamp');
snooplogg.config({ format: null });

log(`
Logging errors is easy!
  ${cyan.open}log(new SyntaxError('This is just a test'));${cyan.close}`);
log(new SyntaxError('This is just a test'));

log(`
SnoopLogg lets you pipe the logs to any writable stream such a file:
  ${cyan.open}snooplogg.pipe(fs.createWriteStream('app.log'));${cyan.close}
  ${cyan.open}info('This message will be written to app.log');${cyan.close}

SnoopLogg can be configured to keep a history of log messages:
  ${cyan.open}snooplogg.config({ history: 100 });${cyan.close}
  ${cyan.open}info('This message happens before piping to a file');${cyan.close}
  ${cyan.open}snooplogg.pipe(fs.createWriteStream('app.log'));${cyan.close}
  ${cyan.open}info('Both of these messages will be written to app.log');${cyan.close}

The killer feature of SnoopLogg is the ability to snoop on other loggers.
Say you have a library that uses SnoopLogg, then you can link the library's
logger to your own logger:
  ${cyan.open}const lib = new SnoopLogg();${cyan.close}
  ${cyan.open}const app = new SnoopLogg();${cyan.close}
  ${cyan.open}app.snoop();${cyan.close}
  ${cyan.open}lib.info('This message will be logged to the app logger');${cyan.close}`);
const lib = new SnoopLogg();
const app = new SnoopLogg();
app.snoop();
lib.info('This message will be logged to the app logger');

log(`\n${redBright.open}♥${redBright.close} Thank you for trying SnoopLogg!`);

const runtime = process.versions.bun ? 'bun' : process.versions.deno ? 'deno' : 'node';

if (!process.env.SNOOPLOGG && !process.env.DEBUG) {
	console.log(
		`Try running: ${cyan.open}SNOOPLOGG=* ${runtime} demo.js${cyan.close}`
	);
} else if (!process.env.SNOOPLOGG_LEVEL) {
	log(`
Don't forget to check out the log level!
  ${cyan.open}SNOOPLOGG=* SNOOPLOGG_LEVEL=warn ${runtime} demo.js${cyan.close}`);
}
