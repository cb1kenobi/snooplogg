import { SnoopLogg } from '../dist/index.js';

{
	const snooplogg = new SnoopLogg().enable('*').pipe(process.stdout);
	console.log('  SNOOPLOGG=*');
	const fooLogger = snooplogg('foo');
	fooLogger.info('FOO!');
	const barLogger = snooplogg('bar');
	barLogger.info('BAR!');
	const bazLogger = snooplogg('baz');
	bazLogger.info('BAZ!');
}

{
	const snooplogg = new SnoopLogg().enable('foo').pipe(process.stdout);
	console.log('\n  SNOOPLOGG=foo');
	const fooLogger = snooplogg('foo');
	fooLogger.info('FOO!');
	const barLogger = snooplogg('bar');
	barLogger.info('BAR!');
	const bazLogger = snooplogg('baz');
	bazLogger.info('BAZ!');
}

{
	const snooplogg = new SnoopLogg().enable('foo,bar').pipe(process.stdout);
	console.log('\n  SNOOPLOGG=foo,bar');
	const fooLogger = snooplogg('foo');
	fooLogger.info('FOO!');
	const barLogger = snooplogg('bar');
	barLogger.info('BAR!');
	const bazLogger = snooplogg('baz');
	bazLogger.info('BAZ!');
}

{
	const snooplogg = new SnoopLogg().enable('b*').pipe(process.stdout);
	console.log('\n  SNOOPLOGG=b*');
	const fooLogger = snooplogg('foo');
	fooLogger.info('FOO!');
	const barLogger = snooplogg('bar');
	barLogger.info('BAR!');
	const bazLogger = snooplogg('baz');
	bazLogger.info('BAZ!');
}

{
	const snooplogg = new SnoopLogg().enable('b*,-baz').pipe(process.stdout);
	console.log('\n  SNOOPLOGG=b*,-baz');
	const fooLogger = snooplogg('foo');
	fooLogger.info('FOO!');
	const barLogger = snooplogg('bar');
	barLogger.info('BAR!');
	const bazLogger = snooplogg('baz');
	bazLogger.info('BAZ!');
}
