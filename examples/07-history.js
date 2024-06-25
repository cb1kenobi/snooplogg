import { SnoopLogg } from '../dist/index.js';

const snooplogg = new SnoopLogg().enable('*');

snooplogg.config({ historySize: 5 });

for (let i = 1; i <= 10; i++) {
	snooplogg.info(`This is message ${i}`);
}

snooplogg.pipe(process.stdout, { flush: true });
