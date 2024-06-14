/**
 * A lightweight, fixed-size value buffer.
 */
export class NanoBuffer<T> {
	/**
	 * The buffer where the values are stored.
	 */
	buffer: T[];

	/**
	 * The index of the newest value in the buffer.
	 */
	_head = 0;

	/**
	 * The maximum number of values to store in the buffer.
	 */
	_maxSize: number;

	/**
	 * The number of values in the buffer.
	 */
	_size = 0;

	/**
	 * Creates a `NanoBuffer` instance.
	 *
	 * @param [maxSize=10] - The initial buffer size.
	 */
	constructor(maxSize = 10) {
		if (typeof maxSize !== 'number') {
			throw new TypeError('Expected maxSize to be a number');
		}

		if (Number.isNaN(maxSize) || maxSize < 0) {
			throw new RangeError('Expected maxSize to be zero or greater');
		}

		this.buffer = Array(maxSize | 0);
		this._maxSize = maxSize;
	}

	/**
	 * Returns the index of the newest value in the buffer.
	 *
	 * @returns {Number}
	 * @access public
	 */
	get head() {
		return this._head;
	}

	/**
	 * Returns the maximum number of values in the buffer.
	 *
	 * @returns {Number}
	 * @access public
	 */
	get maxSize() {
		return this._maxSize;
	}

	/**
	 * Changes the maximum number of values allowed in the buffer.
	 *
	 * @param {Number} new_maxSize - The new max size of the buffer.
	 * @access public
	 */
	set maxSize(new_maxSize) {
		if (typeof new_maxSize !== 'number') {
			throw new TypeError('Expected new max size to be a number');
		}

		if (Number.isNaN(new_maxSize) || new_maxSize < 0) {
			throw new RangeError('Expected new max size to be zero or greater');
		}

		if (new_maxSize === this._maxSize) {
			// nothing to do
			return;
		}

		// somewhat lazy, but we create a new buffer, then manually copy
		// ourselves into it, then steal back the internal values
		const tmp = new NanoBuffer<T>(new_maxSize);
		for (const value of this) {
			if (value !== undefined) {
				tmp.push(value);
			}
		}

		this.buffer = tmp.buffer;
		this._head = tmp.head;
		this._maxSize = tmp._maxSize;
		this._size = tmp.size;
	}

	/**
	 * Returns the number of values in the buffer.
	 *
	 * @returns {Number}
	 * @access public
	 */
	get size() {
		return this._size;
	}

	/**
	 * Inserts a new value into the buffer.
	 *
	 * @param {*} value - The value to store.
	 * @returns {NanoBuffer}
	 * @access public
	 */
	push(value: T) {
		if (this._maxSize) {
			if (this._size > 0) {
				this._head++;
			}

			if (this._head >= this._maxSize) {
				// we wrapped
				this._head = 0;
			}

			this._size = Math.min(this._size + 1, this._maxSize);
			this.buffer[this._head] = value;
		}

		return this;
	}

	/**
	 * Removes all values in the buffer.
	 *
	 * @returns {NanoBuffer}
	 * @access public
	 */
	clear() {
		this.buffer = Array(this._maxSize);
		this._head = 0;
		this._size = 0;
		return this;
	}

	/**
	 * Creates an iterator function for this buffer.
	 *
	 * @return {Function}
	 * @access public
	 */
	[Symbol.iterator]() {
		let i = 0;

		return {
			next: () => {
				// just in case the size changed
				i = Math.min(i, this._maxSize);

				// calculate the index
				let j = this.head + i - (this._size - 1);
				if (j < 0) {
					j += this._maxSize;
				}

				// console.log('\ni=' + i + ' head=' + this._head + ' size=' + this._size + ' maxSize=' + this._maxSize + ' j=' + j);

				const done = i++ >= this._size;
				return {
					value: done ? undefined : this.buffer[j],
					done
				};
			}
		};
	}
}
