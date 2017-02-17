# SnoopLogg

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Travis CI Build][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Code Climate][codeclimate-image]][codeclimate-url]
[![Deps][david-image]][david-url]
[![Dev Deps][david-dev-image]][david-dev-url]

Laid back logging.

## Installation

    npm install snooplogg

## Features

 * Built-in and custom log levels
 * Ability to snoop on other snooplogg instances nested in dependencies
 * Pipe messages to one or more streams
 * Namespacing
 * Filter messages using the `DEBUG` (or `SNOOPLOGG`) environment variable
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

*More docs to come in the future!*

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
