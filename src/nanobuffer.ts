/**
 * A lightweight, fixed-size value buffer.
 */
export class NanoBuffer<T> {
	/**
	 * The buffer where the values are stored.
	 */
	#buffer: T[];

	/**
	 * The index of the newest value in the buffer.
	 */
	#head = 0;

	/**
	 * The maximum number of values to store in the buffer.
	 */
	#maxSize: number;

	/**
	 * The number of values in the buffer.
	 */
	#size = 0;

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

		this.#buffer = Array(maxSize | 0);
		this.#maxSize = maxSize;
	}

	/**
	 * Returns the index of the newest value in the buffer.
	 *
	 * @returns {Number}
	 * @access public
	 */
	get head() {
		return this.#head;
	}

	/**
	 * Returns the maximum number of values in the buffer.
	 *
	 * @returns {Number}
	 * @access public
	 */
	get maxSize() {
		return this.#maxSize;
	}

	/**
	 * Changes the maximum number of values allowed in the buffer.
	 *
	 * @param {Number} newMaxSize - The new max size of the buffer.
	 * @access public
	 */
	set maxSize(newMaxSize) {
		if (typeof newMaxSize !== 'number') {
			throw new TypeError('Expected new max size to be a number');
		}

		if (Number.isNaN(newMaxSize) || newMaxSize < 0) {
			throw new RangeError('Expected new max size to be zero or greater');
		}

		if (newMaxSize === this.#maxSize) {
			// nothing to do
			return;
		}

		// somewhat lazy, but we create a new buffer, then manually copy
		// ourselves into it, then steal back the internal values
		const tmp = new NanoBuffer<T>(newMaxSize);
		for (const value of this) {
			if (value !== undefined) {
				tmp.push(value);
			}
		}

		this.#buffer = tmp.#buffer;
		this.#head = tmp.#head;
		this.#maxSize = tmp.#maxSize;
		this.#size = tmp.#size;
	}

	/**
	 * Returns the number of values in the buffer.
	 *
	 * @returns {Number}
	 * @access public
	 */
	get size() {
		return this.#size;
	}

	/**
	 * Inserts a new value into the buffer.
	 *
	 * @param {*} value - The value to store.
	 * @returns {NanoBuffer}
	 * @access public
	 */
	push(value: T) {
		if (this.#maxSize) {
			if (this.#size > 0) {
				this.#head++;
			}

			if (this.#head >= this.#maxSize) {
				// we wrapped
				this.#head = 0;
			}

			this.#size = Math.min(this.#size + 1, this.#maxSize);
			this.#buffer[this.#head] = value;
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
		this.#buffer = Array(this.#maxSize);
		this.#head = 0;
		this.#size = 0;
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
				i = Math.min(i, this.#maxSize);

				// calculate the index
				let j = this.#head + i - (this.#size - 1);
				if (j < 0) {
					j += this.#maxSize;
				}

				// console.log('\ni=' + i + ' head=' + this.#head + ' size=' + this.#size + ' maxSize=' + this.#maxSize + ' j=' + j);

				const done = i++ >= this.#size;
				return {
					value: done ? undefined : this.#buffer[j],
					done
				};
			}
		};
	}
}
