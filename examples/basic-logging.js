import { SnoopLogg } from '../dist/index.js';

const snooplogg = new SnoopLogg().enable('*').pipe(process.stdout);
snooplogg.log('This is a log() message');
snooplogg.trace('This is a trace() message');
snooplogg.debug('This is a debug() message');
snooplogg.info('This is an info() message');
snooplogg.warn('This is a warn() message');
snooplogg.error('This is an error() message');
snooplogg.panic('This is a panic() message');
