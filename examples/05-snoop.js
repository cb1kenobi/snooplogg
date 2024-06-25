import { SnoopLogg } from '../dist/index.js';

const app = new SnoopLogg().enable('*').pipe(process.stdout);
const lib = new SnoopLogg();

app('app').info(
	'This is the app logger and it will snoop on all other loggers'
);
lib('lib').info('This is the lib logger, but nothing will be logged');
app.snoop();
lib('lib').info("This is the lib logger and I'm being snooped");
