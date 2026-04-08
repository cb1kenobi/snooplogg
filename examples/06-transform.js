import { SnoopLogg } from '../dist/index.js';
import { Transform } from 'node:stream';

class MyTransformer extends Transform {
	constructor(opts = {}) {
		opts.objectMode = true;
		super(opts);
	}

	_transform(msg, enc, cb) {
		if (msg && typeof msg === 'object' && !(msg instanceof Buffer)) {
			this.push(
				JSON.stringify(msg, null, 2)
					.split('\n')
					.map((s) => `  ${s}`)
					.join('\n')
			);
		}
		cb();
	}
}

const out = new MyTransformer();
out.pipe(process.stdout);

const myLogger = new SnoopLogg().enable('*');
myLogger.pipe(out);
myLogger.info('Transform me!');
