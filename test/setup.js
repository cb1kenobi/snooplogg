// travis doesn't support colors, so we have to force it
process.env.FORCE_COLOR = 1;
process.env.COLORTERM = 'truecolor';
delete process.env.CI; // supports-colors really hates us

global.chai = require('chai');
global.chai.use(require('chai-as-promised'));
global.chai.use(require('sinon-chai'));
global.expect = global.chai.expect;
global.sinon = require('sinon');

beforeEach(function () {
	this.sandbox = global.sinon.createSandbox();
	global.spy = this.sandbox.spy.bind(this.sandbox);
	global.stub = this.sandbox.stub.bind(this.sandbox);
});

afterEach(function () {
	delete global.spy;
	delete global.stub;
	this.sandbox.restore();
});
