# SnoopLogg

[![Greenkeeper badge](https://badges.greenkeeper.io/cb1kenobi/snooplogg.svg)](https://greenkeeper.io/)
[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Travis CI Build][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Code Climate][codeclimate-image]][codeclimate-url]
[![Deps][david-image]][david-url]
[![Dev Deps][david-dev-image]][david-dev-url]

Laid back debug logging.

## Installation

    npm install snooplogg

## Features

 * Built-in and custom log levels
 * Ability to snoop on other snooplogg instances nested in dependencies
 * Pipe messages to one or more streams
 * Namespacing
 * Filter messages using the `DEBUG` (or `SNOOPLOGG`) environment variable
 * Automatic color selection with brightness range
 * Includes helper libraries for your convenience
   * [chalk](https://www.npmjs.com/pacakge/chalk)
   * [figures](https://www.npmjs.com/package/figures) (exported as `symbols`)
   * [humanize](https://www.npmjs.com/package/humanize)
   * [moment](https://www.npmjs.com/package/moment)
   * [pluralize](https://www.npmjs.com/package/pluralize)
 * Similar API to [TJ's debug](https://www.npmjs.com/package/debug):
   * `const debug = snooplogg('myapp').log;`

![snooplogg](demo/screenshot.png)

## Examples

```javascript
import log from 'snooplogg';

log.trace('bow'); // writes to stdout/stderr if DEBUG matches + all pipes

log.info('wow')
   .warn('wow')
   .error('wow');
```

```javascript
import snooplogg from 'snooplogg';

const log = snooplogg('myapp');
log.info('bow', 'wow', 'wow'); // writes to stdout/stderr if DEBUG=myapp + all pipes
```

```javascript
import snooplogg from 'snooplogg';

const log = snooplogg.stdio('yippy yo');
log.info('bow', 'wow', 'wow'); // writes to stdout/stderr + all pipes

const log = snooplogg.enable('*')('yippy yay');
log.info('bow', 'wow', 'wow'); // writes to stdout/stderr + all pipes
```

```javascript
import snooplogg from 'snooplogg';

const log = snooplogg
	.pipe(someWritableStream);

log.info('yippy', 'yo');
```

Listen for messages from all `SnoopLogg` instances, even from other
dependencies.

```javascript
import snooplogg, { snoop } from 'snooplogg';

snoop();

const log = snooplogg('bumpin');

log('one');
log
  .trace('two')
  .debug('three')
  .info('and to the four');

log.warn(`It's like this`);
log.error('and like that');
log.fatal('and like this');
```

```javascript
import snooplogg, { type } from 'snooplogg';

type('jin', { color: 'cyan' });
type('juice', { color: 'yellow' });

const log = snooplogg();

log.jin('parents ain\'t home');
log.juice('too much drama', true);
```

### API

#### `snooplogg()`

Creates a namespaced logger as well as defines the global namespaced logger.

#### `snooplogg.log(msg)`

Outputs a message using the standard `console.log()` format syntax.

#### `snooplogg.config(options)`

Allows you to set various instance specific options.

* `colors` - (Array) An array of color names to choose from when auto-selecting a color,
  specifically for rendering the namespace.
* `minBrightness` - (Number) The minimum brightness to auto-select a color. Value must be between 0
  and 255 as well as less than or equal to the `maxBrightness`. Defaults to `80`.
* `maxBrightness` - (Number) The maximum brightness to auto-select a color. Value must be between 0
  and 255 as well as greater than or equal to the `minBrightness`. Defaults to `210`.
* `theme` - (String) The name of the default theme to use. Defaults to `standard`.
* `maxBufferSize` - (Number) The maximum number of log lines to buffer. Used to flush prior messages
  to new pipes.

Returns the original `SnoopLogg` instance.

### Enabling Logging

By default, Snooplogg only prints messages if the the `DEBUG` or `SNOOPLOGG` environment variables
are set.

```bash
# macOS and Linux
$ DEBUG=izzle node loggfather.js

# Windows PowerShell
> $Env:DEBUG="izzle" node loggfather.js

# Windows Command Prompt
> set DEBUG=izzle
> node loggfather.js
```

> Note: You may also use the `SNOOPLOGG` environment variable to avoid conflicts
> with other libraries that use [debug](https://www.npmjs.com/package/debug)

You can also use any environment variable you want by simply calling `enable()` before logging.

```javascript
import snooplogg from 'snooplogg';

// change the global environment variable name
snooplogg.enable(process.env.LOGGFATHER);
```

### Global Defaults

SnoopLogg allows you to set defaults using environment variables that apply to all SnoopLogg
instances.

* `SNOOPLOGG_COLOR_LIST` - A comma-separated list of supported color names.
* `SNOOPLOGG_DEFAULT_THEME` - Sets the `theme`.
* `SNOOPLOGG_MAX_BUFFER_SIZE` - Sets the `maxBufferSize`.
* `SNOOPLOGG_MAX_BRIGHTNESS` - Sets the `maxBrightness`.
* `SNOOPLOGG_MIN_BRIGHTNESS` - Sets the `minBrightness`.

## License

(The MIT License)

Copyright (c) 2017 Chris Barber

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

[npm-image]: https://img.shields.io/npm/v/snooplogg.svg
[npm-url]: https://npmjs.org/package/snooplogg
[downloads-image]: https://img.shields.io/npm/dm/snooplogg.svg
[downloads-url]: https://npmjs.org/package/snooplogg
[travis-image]: https://img.shields.io/travis/cb1kenobi/snooplogg.svg
[travis-url]: https://travis-ci.org/cb1kenobi/snooplogg
[coveralls-image]: https://img.shields.io/coveralls/cb1kenobi/snooplogg/master.svg
[coveralls-url]: https://coveralls.io/r/cb1kenobi/snooplogg
[codeclimate-image]: https://img.shields.io/codeclimate/github/cb1kenobi/snooplogg.svg
[codeclimate-url]: https://codeclimate.com/github/cb1kenobi/snooplogg
[david-image]: https://img.shields.io/david/cb1kenobi/snooplogg.svg
[david-url]: https://david-dm.org/cb1kenobi/snooplogg
[david-dev-image]: https://img.shields.io/david/dev/cb1kenobi/snooplogg.svg
[david-dev-url]: https://david-dm.org/cb1kenobi/snooplogg#info=devDependencies
