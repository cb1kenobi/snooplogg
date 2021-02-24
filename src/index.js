import * as bryt from 'bryt-lite';
import chalk from 'chalk';
import NanoBuffer from 'nanobuffer';
import supportsColor from 'supports-color';
import util from 'util';

import { Console } from 'console';
import { Transform, Writable } from 'stream';

/**
 * The secret sauce.
 */
class Functionator extends Function {
	constructor(fn) {
		return Object.setPrototypeOf(fn, new.target.prototype);
	}
}

/**
 * Contains a namespaced logger. The actual log functions are defined on the Logger's prototype.
 *
 * Note that this is for internal use only and should not used publicly.
 */
class Logger extends Functionator {
	/**
	 * Constructs a new logger instance.
	 *
	 * @param {?String} [namespace] - The name for this logger instance.
	 * @param {?Logger} [parent] - The parent logger.
	 * @param {?SnoopLogg} [root] - A reference to the top-level SnoopLogg instance.
	 * @param {?String} [style] - The style for this namespace. Ultimately it's up to the theme as
	 * to how the namespace is styled.
	 * @access public
	 */
	constructor(namespace, parent = null, root = null, style = null) {
		const ns = !namespace ? [] : (parent && parent._ns || []).concat(namespace);

		super(namespace => {
			if (!this._namespaces[namespace]) {
				this._namespaces[namespace] = bind(
					Object.setPrototypeOf(
						new Logger(namespace, this, this._root, style),
						this._root.proto
					)
				);
			}
			return this._namespaces[namespace];
		});

		Object.defineProperties(this, {
			/**
			 * The actual log namespace used for filtering. Namespaces are separated by a colon (:).
			 * @type {String}
			 */
			_namespace: { writable: true, value: ns.join(':') },

			/**
			 * A map of namespaces under this logger.
			 * @type {Object}
			 */
			_namespaces: { value: {} },

			/**
			 * The style for the namespace. This value is either manually specified or automatically
			 * chosen.
			 * @type {String}
			 */
			_namespaceStyle: { value: style },

			/**
			 * An array of namespaces to make it easier when constructing a new namespace's name.
			 * @type {Array.<String>}
			 */
			_ns: { writable: true, value: ns },

			/**
			 * A reference to the parent logger. Used to construct the namespace.
			 * @type {?Logger}
			 */
			_parent: { writable: true, value: parent },

			/**
			 * A reference to the top-level SnoopLogg instance.
			 * @type {?SnoopLogg}
			 */
			_root: { value: root || this }
		});
	}

	/**
	 * Creates a `console` object that is wired up to this snooplogg instance.
	 *
	 * @type {Console}
	 * @access public
	 */
	get console() {
		if (!this._console) {
			this._console = new Console(
				this.createStream({ type: 'error', fd: 2 }),
				this.createStream({ type: 'log', fd: 1 })
			);
		}

		return this._console;
	}

	/**
	 * Creates a writable stream that when written to will write to this logger.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {Number} [opts.fd] - The file descriptor to pass along with the log message.
	 * @param {String} [opts.type] - The name of the type of messages being logged to this stream.
	 * @returns {Writable}
	 * @access public
	 */
	createStream({ fd, type } = {}) {
		return new StdioDispatcher(this, {
			type,
			fd,
			ns: this._namespace,
			nsStyle: this._namespaceStyle,
			enabled: this.enabled
		});
	}

	/**
	 * Determines if this logger is enabled based on the pattern set by SnoopLogg's `enable()`.
	 * @type {Boolean}
	 * @access public
	 */
	get enabled() {
		return this._root.isEnabled(this._namespace);
	}

	/**
	 * The fully resolved namespace including parent namespaces.
	 * @type {?String}
	 * @access public
	 */
	get namespace() {
		return this._namespace || null;
	}
}

/**
 * Defines the global logger instance which added additional public APIs for configuration and
 * features.
 */
class SnoopLogg extends Logger {
	/**
	 * Generates a namespaced logger class with the `SnoopLogg` prototype and initializes its
	 * properties.
	 *
	 * @param {Object} [opts] - Various config options.
	 * @access public
	 */
	constructor(opts) {
		if (opts !== undefined && (!opts || typeof opts !== 'object')) {
			throw new TypeError('Expected options to be an object');
		}

		super();

		Object.defineProperties(this, {
			/**
			 * A regex pattern of namespaces to match or the string `*` to allow all namespaces.
			 * @type {RegExp|String|null}
			 */
			_allow:  { writable: true, value: null },

			/**
			 * A cache of hashes to auto-selected colors.
			 * @type {Object}
			 */
			_autoCache: { writable: true, value: {} },

			/**
			 * The log message buffer.
			 * @type {Array.<Object>}
			 */
			_buffer: {
				writable: true,
				value: new NanoBuffer(process.env.SNOOPLOGG_MAX_BUFFER_SIZE !== undefined ? Math.max(0, parseInt(process.env.SNOOPLOGG_MAX_BUFFER_SIZE)) : 0)
			},

			/**
			 * An array of available colors to choose from when rendering auto-styled labels such
			 * as the namespace.
			 * @type {Array.<String>}
			 */
			_colors: {
				writable: true,
				value: process.env.SNOOPLOGG_COLOR_LIST ? process.env.SNOOPLOGG_COLOR_LIST.split(',') : []
			},

			/**
			 * The default theme to apply if a stream didn't specify one.
			 * @type {String}
			 */
			_defaultTheme: { writable: true, value: process.env.SNOOPLOGG_DEFAULT_THEME || 'standard' },

			/**
			 * A lazy unique identifier for this `SnoopLogg` instance. This is used to prevent this
			 * instance from processing it's own messages.
			 * @type {Number}
			 */
			_id: { value: Math.round(Math.random() * 1e9) },

			/**
			 * A regex pattern of namespaces to ignore.
			 * @type {RegExp|null}
			 */
			_ignore: { writable: true, value: null },

			/**
			 * Options that are passed into `util.inspect()` to stringify objects. If set to
			 * `null`, then the value is stringified using Node's `util.format()`.
			 * @type {Object}
			 */
			_inspectOptions: {
				writable: true,
				value: {
					breakLength: 0,
					colors: true,
					depth: 4,
					showHidden: false
				}
			},

			/**
			 * The minumum brightness when auto-selecting a color. Defaults to `80`.
			 * @type {Number}
			 */
			_minBrightness: {
				writable: true,
				value: process.env.SNOOPLOGG_MIN_BRIGHTNESS !== undefined ? Math.min(255, Math.max(0, parseInt(process.env.SNOOPLOGG_MIN_BRIGHTNESS))) : 80
			},

			/**
			 * A list of middlewares to call and process log messages prior
			 * to dispatching.
			 * @type {Array.<Function>}
			 */
			_middlewares: { value: [] },

			/**
			 * The maximum brightness when auto-selecting a color. Defaults to `210`.
			 * @type {Number}
			 */
			_maxBrightness: {
				writable: true,
				value: process.env.SNOOPLOGG_MAX_BRIGHTNESS !== undefined ? Math.min(255, Math.max(0, parseInt(process.env.SNOOPLOGG_MAX_BRIGHTNESS))) : 210
			},

			/**
			 * A list of objects containing the stream and theme name.
			 * @type {Array.<Object>}
			 */
			_streams: { value: [] },

			/**
			 * A map of style names and their functions.
			 * @type {Object}
			 */
			styles: { enumerable: true, value: {} },

			/**
			 * A list of themes and the function to apply them.
			 * @type {Object.<String,Function>}
			 */
			_themes: { value: {} },

			/**
			 * A map of all registered log types.
			 * @type {Object.<String, Number>}
			 */
			_types: { value: {} },

			/**
			 * Re-export of the `chalk` library.
			 * @type {Object}
			 */
			chalk: {
				enumerable: true,
				value: chalk
			}
		});

		// This is where things get complicated...
		//
		// The prototype chain at this point looks like this:
		//
		//    `SnoopLogg.prototype`
		//      `Logger.prototype`
		//        `Functionator.prototype`
		//          `Object.prototype`
		//
		// We want `type()` to dynamically add new log functions to `Logger.prototype` so that
		// every namespace under a specific `SnoopLogg` instance can use it, but we don't want
		// the new log functions added to every `SnoopLogg` instance.
		//
		// We need to generate a new `Logger.prototype` and swap out the original in this
		// instance's prototype for a cloned `Logger.prototype` that `type()` can modify. To make
		// things more complicated, you can't just swap out the `Logger.prototype` because it's
		// under `SnoopLogg.prototype` and that would affect every `SnoopLogg` instance.
		//
		// What we need to do is create a new `Logger.prototype` and cache it so nested namespaced
		// `Logger` instances can reference it. Then we need to a generate a new `SnoopLogg`
		// prototype that extends the generated `Logger.prototype` and set the prototype of this
		// instance to it.
		//
		//    Cloned `SnoopLogg.prototype`
		//      Cloned and cached `Logger.prototype`
		//        'Functionator.prototype`
		//          'Object.prototype'

		this.proto = Object.create(Functionator, Object.getOwnPropertyDescriptors(Logger.prototype));
		Object.defineProperty(this.proto, '__id', { value: this._id });

		Object.setPrototypeOf(this, Object.create(this.proto, Object.getOwnPropertyDescriptors(SnoopLogg.prototype)));

		if (opts) {
			this.config(opts);
		}
	}

	/**
	 * Stylizes text.
	 *
	 * @param {String} style - A comma-separated list of styles to apply.
	 * @param {*} text - The string to stylize.
	 * @returns {String}
	 * @access private
	 */
	applyStyle(style, text) {
		if (style && text) {
			return style.split(',').reduce((text, style) => this.styles[style] ? this.styles[style](text) : text, String(text));
		}
		return text;
	}

	/**
	 * Allows settings to be changed.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {String|Array.<String>} [opts.colors] - An array or comma-separated list of colors to
	 * choose from when auto-styling.
	 * @param {Object} [opts.inspectOptions] - Options to pass into `util.inspect()` when
	 * stringifying objects. Set to `null` to stringify objects using Node's `util.format()`.
	 * @param {Number} [opts.maxBufferSize] - The max buffer size.
	 * @returns {SnoopLogg}
	 * @access public
	 */
	config(opts = {}) {
		if (!opts || typeof opts !== 'object') {
			throw new TypeError('Expected config options to be an object');
		}

		if (opts.colors) {
			if (typeof opts.colors !== 'string' && !Array.isArray(opts.colors)) {
				throw new TypeError('Expected colors to be a string or array');
			}
			this._colors = typeof opts.colors === 'string' ? opts.colors.split(',') : opts.colors;
		}

		if (opts.inspectOptions) {
			if (typeof opts.inspectOptions !== 'object') {
				throw new TypeError('Expected inspect options to be an object');
			}
			this._inspectOptions = opts.inspectOptions;
		}

		if (opts.minBrightness) {
			if (typeof opts.minBrightness !== 'number') {
				throw new TypeError('Expected minimum brightness to be a number');
			}
			if (opts.minBrightness < 0 || opts.minBrightness > 255) {
				throw new RangeError('Minimum brightness must be between 0 and 255');
			}
			this._minBrightness = opts.minBrightness;
		}

		if (opts.maxBrightness) {
			if (typeof opts.maxBrightness !== 'number') {
				throw new TypeError('Expected maximum brightness to be a number');
			}
			if (opts.maxBrightness < 0 || opts.maxBrightness > 255) {
				throw new RangeError('Maximum brightness must be between 0 and 255');
			}
			if (opts.maxBrightness < this._minBrightness) {
				throw new RangeError('Maximum brightness must greater than or equal to the minimum brightness');
			}
			this._maxBrightness = opts.maxBrightness;
		}

		if (opts.theme) {
			if (typeof opts.theme !== 'string') {
				throw new TypeError('Expected theme to be a string');
			}
			this._defaultTheme = opts.theme;
		}

		if (Object.prototype.hasOwnProperty.call(opts, 'maxBufferSize')) {
			try {
				this._buffer.maxSize = opts.maxBufferSize;
			} catch (e) {
				let err = e;
				if (e instanceof TypeError) {
					err = new TypeError(`Invalid max buffer size: ${e.message}`);
				} else if (e instanceof RangeError) {
					err = new RangeError(`Invalid max buffer size: ${e.message}`);
				}
				throw err;
			}
		}

		return this;
	}

	/**
	 * Dispatches a message object through the middlewares, filters, and eventually to all output
	 * streams.
	 *
	 * @param {Object} msg - A message object.
	 * @param {Array} msg.args - An array of zero or more arguments that will be formatted into the
	 * final log message.
	 * @access public
	 */
	dispatch(msg) {
		if (!msg || typeof msg !== 'object') {
			return;
		}

		if (!Array.isArray(msg.args)) {
			throw new TypeError('Expected args to be an array');
		}

		// run all middleware
		for (const { fn } of this._middlewares) {
			msg = fn(msg) || msg;
		}

		// add the message to the buffer
		this._buffer.push(msg);

		if ((msg.id === this._id && msg.enabled) || (msg.id !== this._id && this.isEnabled(msg.ns))) {
			for (const s of this._streams) {
				msg.formatter = this._themes[s.theme] || this._themes[this._defaultTheme];
				s.stream.write(s.stream._writableState && s.stream._writableState.objectMode ? msg : format(msg));
			}
		}

		if (msg.id === this._id) {
			process.emit('snooplogg', msg);
		}
	}

	/**
	 * Enables log output for the given pattern.
	 *
	 * @param {String} [pattern] - A string with one or more comma-separated namespaces to enable
	 * logging for. If the string is empty or null, then all log output will be silenced. If the
	 * pattern is `*`, then all log messages will be displayed.
	 * @returns {SnoopLogg}
	 * @access public
	 */
	enable(pattern = '') {
		if (pattern && typeof pattern !== 'string' && !(pattern instanceof RegExp)) {
			throw new TypeError('Expected pattern to be a string or regex');
		}

		this._allow = null;
		this._ignore = null;

		if (pattern === '*') {
			this._allow = '*';

		} else if (pattern instanceof RegExp) {
			this._allow = pattern;

		} else if (pattern) {
			const allows = [];
			const ignores = [];

			for (let p of pattern.split(/[\s,]+/)) {
				if (p) {
					p = p.replace(/\*/g, '.*?');
					if (p[0] === '-') {
						ignores.push(p.slice(1));
					} else {
						allows.push(p);
					}
				}
			}

			if (allows.length) {
				this._allow = new RegExp(`^(${allows.join('|')})$`);
			} else {
				this._allow = /./;
			}

			if (ignores.length) {
				this._ignore = new RegExp(`^(${ignores.join('|')})$`);
			}
		}

		return this;
	}

	/**
	 * Determines if the specified namespace is enabled.
	 *
	 * @param {?String} namespace - The namespace.
	 * @returns {Boolean}
	 * @access public
	 */
	isEnabled(namespace) {
		const allow = this._allow;
		if (allow === null) {
			// all logging is silenced
			return false;
		}

		if (!namespace || allow === '*') {
			// nothing to filter
			return true;
		}

		const ignore = this._ignore;
		if (allow && allow.test(namespace) && (!ignore || !ignore.test(namespace))) {
			return true;
		}

		return false;
	}

	/**
	 * Explicit way of creating a namespace. `snooplogg('foo")` and `snooplogg.ns('foo')` are
	 * equivalent.
	 *
	 * @param {?String} [namespace] - The name for this logger instance.
	 * @returns {Logger}
	 * @access public
	 */
	ns(namespace) {
		if (!this._namespaces[namespace]) {
			this._namespaces[namespace] = bind(Object.setPrototypeOf(new Logger(namespace, this, this), this.proto));
		}
		return this._namespaces[namespace];
	}

	/**
	 * Adds a stream to pipe log messages to.
	 *
	 * @param {stream.Writable} stream - The stream to pipe messages to.
	 * @param {Object} [opts] - Various options.
	 * @param {Boolean} [opts.flush=false] - When true, immediately flushes the buffer of log
	 * messages to the stream.
	 * @param {String} [opts.theme] - The theme to apply to all messages written to this stream.
	 * @returns {SnoopLogg}
	 * @access public
	 */
	pipe(stream, opts = {}) {
		if (!stream) {
			throw new TypeError('Invalid stream');
		}

		if (opts && typeof opts !== 'object') {
			throw new TypeError('Expected options to be an object');
		}

		// don't add the stream twice
		for (const s of this._streams) {
			if (s.stream === stream) {
				return this;
			}
		}
		this._streams.push({ stream, theme: opts.theme });

		// listen if the stream ends so we can remove it
		stream.on('end', () => {
			for (let i = 0; i < this._streams.length; i++) {
				if (this._streams[i].stream === stream) {
					this._streams.splice(i--, 1);
				}
			}
		});

		// flush the buffers
		if (opts.flush) {
			for (const msg of this._buffer) {
				if ((msg.id === this._id && msg.enabled) || (msg.id !== this._id && this.isEnabled(msg.ns))) {
					msg.formatter = opts.theme && this._themes[opts.theme] || this._themes[this._defaultTheme];
					stream.write(stream._writableState && stream._writableState.objectMode ? msg : format(msg));
				}
			}
		}

		return this;
	}

	/**
	 * Starts listenening for events from other SnoopLogg instances.
	 *
	 * @param {String} [nsPrefix] - An optional label to prepend to the namespace for log messages
	 * from other SnoopLogg instances.
	 * @returns {SnoopLogg}
	 * @access public
	 */
	snoop(nsPrefix) {
		if (nsPrefix && typeof nsPrefix !== 'string') {
			throw new TypeError('Expected namespace prefix to be a string');
		}

		this.unsnoop();

		this.onSnoopMessage = msg => {
			if (msg.id !== this._id) {
				if (nsPrefix) {
					msg = Object.assign({}, msg);
					msg.ns = nsPrefix + (msg.ns || '');
				}
				this.dispatch(msg);
			}
		};

		process.on('snooplogg', this.onSnoopMessage);

		return this;
	}

	/**
	 * Enables all namespaces effectively allowing all logging to be written to stdout/stderr.
	 *
	 * @returns {SnoopLogg}
	 * @access public
	 */
	get stdio() {
		return this.enable('*');
	}

	/**
	 * Registers a function that applies a style to a message.
	 *
	 * @param {String} name - The name of the style.
	 * @param {Function} fn - A function to call that applies the style.
	 * @returns {SnoopLogg}
	 * @access public
	 */
	style(name, fn) {
		if (!name || typeof name !== 'string') {
			throw new TypeError('Expected name to be a string');
		}

		if (!fn || typeof fn !== 'function') {
			throw new TypeError('Expected fn to be a function');
		}

		this.styles[name] = fn.bind(this);

		return this;
	}

	/**
	 * Registers a function that applies a theme to a message.
	 *
	 * @param {String} name - The name of the theme.
	 * @param {Function} fn - A function to call that applies the theme.
	 * @returns {SnoopLogg}
	 * @access public
	 */
	theme(name, fn) {
		if (!name || typeof name !== 'string') {
			throw new TypeError('Expected name to be a string');
		}

		if (!fn || typeof fn !== 'function') {
			throw new TypeError('Expected fn to be a function');
		}

		this._themes[name] = fn.bind(this);

		return this;
	}

	/**
	 * Registers a new log type.
	 *
	 * @param {String} name - The log type name.
	 * @param {Object} [opts] - Various options.
	 * @param {String} [opts.style] - The color to associate with this type.
	 * @param {String} [opts.label] - The label to display when print this type of log message.
	 * @param {Number} [opts.fd] - The file descriptor. Use `0` for stdout and `1` for stderr.
	 * @returns {SnoopLogg}
	 * @access public
	 */
	type(name, opts = {}) {
		if (!name || typeof name !== 'string') {
			throw new TypeError('Expected name to be a non-empty string');
		}

		if (!opts || typeof opts !== 'object') {
			throw new TypeError('Expected opts to be an object');
		}

		const type = this._types[name] = {
			type:      name,
			typeStyle: opts.style,
			typeLabel: opts.label !== undefined ? opts.label : name,
			fd:        opts.fd || 0
		};

		if (!Object.getOwnPropertyDescriptor(this.proto, name)) {
			// wire up the actual log type function
			// note: this has to use a getter so that `this` can be resolved at
			// runtime because if you `import { info } from 'SnoopLogg'`, `info()`
			// gets forced into the global context.
			const root = this;
			Object.defineProperty(this.proto, name, {
				configurable: true,
				enumerable: true,
				value(...args) {
					root.dispatch({
						id: root._id,
						args: typeof opts.transform === 'function' ? opts.transform(args) : args,
						...type,
						ns: this._namespace,
						nsStyle: this._namespaceStyle,
						ts: new Date,
						enabled: this.enabled
					});
					return this;
				}
			});
		}

		return this;
	}

	/**
	 * Stops piping messages to the specified stream.
	 *
	 * @param {stream.Writable} stream - The stream to no longer pipe messages to.
	 * @returns {SnoopLogg}
	 * @access public
	 */
	unpipe(stream) {
		if (!stream) {
			throw new TypeError('Invalid stream');
		}

		for (let i = 0; i < this._streams.length; i++) {
			if (this._streams[i].stream === stream) {
				this._streams.splice(i--, 1);
			}
		}

		return this;
	}

	/**
	 * Stops listenening for events from other SnoopLogg instances.
	 *
	 * @returns {SnoopLogg}
	 * @access public
	 */
	unsnoop() {
		if (this.onSnoopMessage) {
			process.removeListener('snooplogg', this.onSnoopMessage);
		}
		return this;
	}

	/**
	 * Adds a middleware function to the message dispatching system.
	 *
	 * @param {Function} middleware - A middleware function to add to the list.
	 * @param {Number} [priority=0] - The middleware priority. Negative priority is run before
	 * positive values.
	 * @returns {SnoopLogg}
	 * @access public
	 */
	use(middleware, priority = 0) {
		if (typeof middleware !== 'function') {
			throw new TypeError('Expected middleware to be a function');
		}

		if (typeof priority !== 'number') {
			throw new TypeError('Expected priority to be a number');
		}

		this._middlewares.push({ fn: middleware, priority });
		this._middlewares.sort((a, b) => b.priority - a.priority);

		return this;
	}
}

/**
 * Applies the formatter to the message and returns the resulting string.
 *
 * @param {Object} msg - The message object
 * @returns {String}
 */
function format(msg) {
	if (msg && typeof msg === 'object' && !(msg instanceof Buffer)) {
		if (typeof msg.formatter === 'function') {
			return msg.formatter(msg);
		}
		return util.format.apply(null, msg.args) + '\n';
	}
	return String(msg);
}

/**
 * ANSI color sequence regex.
 * @type {RegExp}
 */
const pattern = [
	'[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)',
	'(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))'
].join('|');
const stripRegExp = new RegExp(pattern, 'g');

/**
 * Transform stream that strips colors from the logger to the next stream in the
 * pipe.
 */
class StripColors extends Transform {
	constructor(opts = {}) {
		opts.objectMode = true;
		super(opts);
	}

	_transform(msg, enc, cb) {
		/* istanbul ignore else */
		if (msg && typeof msg === 'object' && !(msg instanceof Buffer)) {
			this.push(format(msg).replace(stripRegExp, ''));
		} else {
			this.push(msg.toString().replace(stripRegExp, ''));
		}
		cb();
	}
}

/**
 * Helper stream that converts and formats the message object to a string. If
 * the message has already been converted to a string, then this simply passes
 * the text through.
 */
class Format extends Transform {
	constructor(opts = {}) {
		opts.objectMode = true;
		super(opts);
	}

	_transform(msg, enc, cb) {
		/* istanbul ignore else */
		if (msg && typeof msg === 'object' && !(msg instanceof Buffer)) {
			this.push(format(msg));
		} else {
			this.push(msg);
		}
		cb();
	}
}

/**
 * The default stream that writes log messages to stdio.
 */
class StdioStream extends Writable {
	constructor(opts = {}) {
		opts.objectMode = true;
		super(opts);

		const stdout = opts.stdout || process.stdout;
		const stderr = opts.stderr || process.stderr;

		/* istanbul ignore else */
		if (supportsColor) {
			this.stdout = stdout;
			this.stderr = stderr;
		} else {
			(this.stdout = new StripColors).pipe(stdout);
			(this.stderr = new StripColors).pipe(stderr);
		}
	}

	_write(msg, enc, cb) {
		/* istanbul ignore next */
		if (msg && typeof msg === 'object' && !(msg instanceof Buffer)) {
			if (msg.fd === 1) {
				this.stderr.write(format(msg));
			} else {
				this.stdout.write(format(msg));
			}
		} else {
			this.stdout.write(String(msg));
		}
		cb();
	}
}

/**
 * A writable stream that will
 *
 * @class StdioDispatcher
 * @extends {Writable}
 */
class StdioDispatcher extends Writable {
	constructor(logger, params) {
		super();
		this.logger = logger;
		this.params = params;
	}

	_write(data, enc, cb) {
		const origin = this.logger._root || this.logger;
		origin.dispatch({
			id:      origin._id,
			args:    [ data.toString().replace(/(\r\n|\n)$/, '') ],
			ts:      new Date,
			...this.params
		});
		cb();
	}
}

/**
 * Loops over an `SnoopLogg` or `Logger` instance's prototype chain up to the `Functionator`
 * prototype while binding the prototype functions directly to the instance object so that
 * the method's context isn't lost if the log functions aren't destructured.
 *
 * @param {Object} obj - The object instance to bind methods to.
 * @returns {Object} The original object.
 */
function bind(obj) {
	for (let proto = obj.__proto__; proto; proto = proto.__proto__) {
		for (const prop of Object.getOwnPropertyNames(proto)) {
			let desc = Object.getOwnPropertyDescriptor(proto, prop);

			if (prop === 'constructor' || !desc) {
				continue;
			} else if (typeof desc.get === 'function') {
				desc.get = desc.get.bind(obj);
			} else if (typeof desc.value === 'function') {
				desc.value = desc.value.bind(obj);
			} else {
				continue;
			}

			Object.defineProperty(obj, prop, desc);
		}

		if (proto.constructor.name === 'Functionator') {
			break;
		}
	}
	return obj;
}

/**
 * Creates a snooplogg instance with a bunch of defaults.
 *
 * @returns {SnoopLogg}
 */
function createInstanceWithDefaults() {
	return bind(new SnoopLogg()
		.type('log',   { style: 'gray', label: null })
		.type('trace', {
			style: 'gray',
			transform(args) {
				const err = {
					name:    'Trace',
					message: util.format.apply(null, args)
				};
				Error.captureStackTrace(err);

				// no sense leaving this function in the stack
				return [ `${err.name}${err.message ? `: ${err.message}` : ''}\n${err.stack.split('\n').slice(3).join('\n')}` ];
			}
		})
		.type('debug', { style: 'magenta' })
		.type('info',  { style: 'green' })
		.type('warn',  { style: 'yellow',      fd: 1 })
		.type('error', { style: 'red',         fd: 1 })
		.type('fatal', { style: 'white,bgRed', fd: 1 })

		.style('bold',          chalk.bold)
		.style('dim',           chalk.dim)
		.style('italic',        chalk.italic)
		.style('underline',     chalk.underline)
		.style('inverse',       chalk.inverse)
		.style('hidden',        chalk.hidden)
		.style('strikethrough', chalk.strikethrough)

		.style('black',         chalk.black)
		.style('red',           chalk.red)
		.style('black',         chalk.black)
		.style('green',         chalk.green)
		.style('yellow',        chalk.yellow)
		.style('blue',          chalk.blue)
		.style('magenta',       chalk.magenta)
		.style('cyan',          chalk.cyan)
		.style('white',         chalk.white)
		.style('gray',          chalk.gray)

		.style('bgBlack',       chalk.bgBlack)
		.style('bgRed',         chalk.bgRed)
		.style('bgGreen',       chalk.bgGreen)
		.style('bgYellow',      chalk.bgYellow)
		.style('bgBlue',        chalk.bgBlue)
		.style('bgMagenta',     chalk.bgMagenta)
		.style('bgCyan',        chalk.bgCyan)
		.style('bgWhite',       chalk.bgWhite)

		.style('uppercase',     s => String(s).toUpperCase())
		.style('lowercase',     s => String(s).toLowerCase())
		.style('bracket',       s => `[${s}]`)
		.style('paren',         s => `(${s})`)

		.style('highlight',     chalk.cyan)
		.style('lowlight',      chalk.blue)
		.style('ok',            chalk.green)
		.style('notice',        chalk.yellow)
		.style('alert',         chalk.red)
		.style('note',          chalk.gray)

		.style('auto', function (text) {
			let hash = 0;
			for (const i in text) {
				hash = (((hash << 5) - hash) + text.charCodeAt(i)) | 0;
			}
			hash = Math.abs(hash);

			// check the cache first
			let color = this._autoCache[hash];

			if (!color) {
				// no cache, do we have a list of valid colors?
				let colors = this._colors;

				if (colors && colors.length) {
					// yes, pick from the list of colors
					color = this._autoCache[hash] = colors[hash % colors.length];
				} else {
					// no list, pick a brightness and then load the lookup table and pick a color
					const brightness = (hash % Math.max(1, this._maxBrightness - this._minBrightness)) + this._minBrightness;
					const { count, getColor } = bryt.getBrightness(brightness);

					/* istanbul ignore if */
					if (!count) {
						// this should never happen
						return text;
					}

					color = this._autoCache[hash] = bryt.toRGB(getColor(hash % count));
				}
			}

			if (Array.isArray(color)) {
				return chalk.rgb.apply(chalk, color)(text);
			}

			return this.styles[color](text);
		})

		.theme('detailed', function (msg) {
			const ns = this.applyStyle(msg.nsStyle || 'auto', msg.ns);
			const type = this.applyStyle(msg.typeStyle, msg.typeLabel);
			const ts = msg.ts instanceof Date ? msg.ts : new Date(msg.ts);
			const prefix = this.applyStyle('magenta', ts.toISOString()) + ' ' + (ns ? ns + ' ' : '') + (type ? type + ' ' : '');
			const args = this._inspectOptions ? msg.args.map(it => isJSON(it) ? util.inspect(it, this._inspectOptions) : it) : msg.args;
			const result = util.format.apply(null, args);
			return `${prefix ? result.split('\n').map(s => prefix + s).join('\n') : result}\n`;
		})
		.theme('standard', function (msg) {
			const ns = this.applyStyle(msg.nsStyle || 'auto', msg.ns);
			const type = this.applyStyle(msg.typeStyle, msg.typeLabel);
			const prefix = (ns ? ns + ' ' : '') + (type ? type + ' ' : '');
			const args = this._inspectOptions ? msg.args.map(it => isJSON(it) ? util.inspect(it, this._inspectOptions) : it) : msg.args;
			const result = util.format.apply(null, args);
			return `${prefix ? result.split('\n').map(s => prefix + s).join('\n') : result}\n`;
		})
		.theme('minimal', function (msg) {
			const args = this._inspectOptions ? msg.args.map(it => isJSON(it) ? util.inspect(it, this._inspectOptions) : it) : msg.args;
			return `${util.format.apply(null, args)}\n`;
		})
	);
}

/**
 * Checks if a variable is a JSON compatible object.
 *
 * @param {*} it - The value to check.
 * @returns {Boolean}
 */
function isJSON(it) {
	if (it === null || typeof it !== 'object') {
		return false;
	}
	const proto = Object.getPrototypeOf(it);
	return proto && proto.constructor && proto.constructor.name === 'Object';
}

// create the global instance and wire up the built-in types
const instance = createInstanceWithDefaults()
	.enable(process.env.SNOOPLOGG || process.env.DEBUG)
	.pipe(new StdioStream, { flush: true });

export default instance;

export {
	createInstanceWithDefaults,
	Format,
	Logger,
	SnoopLogg,
	StdioStream,
	StripColors
};
