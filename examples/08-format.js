import { SnoopLogg } from '../dist/index.js';

const snooplogg = new SnoopLogg().enable('*').pipe(process.stdout);

snooplogg.info('This is the default format');

snooplogg.config({
	format(msg, styles) {
		const { args, colors, elements, method, ns, ts, uptime } = msg;
		return `  ${ts.toISOString()} [${method}] ${args.join(' ')}`;
	}
});

snooplogg.info('This is the custom format');
