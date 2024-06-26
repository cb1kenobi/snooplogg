import { SnoopLogg } from '../dist/index.js';

const snooplogg = new SnoopLogg().enable('*').pipe(process.stdout);

snooplogg.info('My name is %s and my favorite drink is %s', 'Snoop', 'juice');

snooplogg.debug({
	name: 'Snoop',
	occupation: 'Logger'
});

snooplogg.trace(3.14);

snooplogg.error(new Error('This is an error'));
