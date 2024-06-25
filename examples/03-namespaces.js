import { SnoopLogg } from '../dist/index.js';

const snooplogg = new SnoopLogg().enable('*').pipe(process.stdout);

snooplogg.info('This is the default namespace');

const fooLogger = snooplogg('foo');
fooLogger.info('This is the foo namespace');

const barLogger = fooLogger('bar');
barLogger.info('This is the bar namespace');

const bazLogger = snooplogg('baz');
bazLogger.info('This is the baz namespace');
