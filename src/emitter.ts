/**
 * Lightweight EventEmitter-like class used for the global SnoopLogg message
 * bus.
 */
export class SnoopEmitter {
	private events: Record<string, ((...args: any[]) => void)[]> = {};

	addListener(event: string, listener: (...args: any[]) => void): this {
		return this.on(event, listener);
	}

	emit(event: string, ...args: any[]): boolean {
		const listeners = this.events[event];
		const len = listeners?.length ?? 0;

		if (len === 0) {
			return false;
		}

		if (len === 1) {
			listeners[0](...args);
		} else {
			for (let i = 0; i < len; i++) {
				listeners[i](...args);
			}
		}
		return true;
	}

	off(event: string, listenerToRemove: (...args: any[]) => void): this {
		const listeners = this.events[event];
		if (listeners) {
			this.events[event] = listeners.filter(
				(listener) => listener !== listenerToRemove
			);
		}
		return this;
	}

	on(event: string, listener: (...args: any[]) => void): this {
		if (!this.events[event]) {
			this.events[event] = [listener];
		} else {
			this.events[event].push(listener);
		}
		return this;
	}

	removeListener(event: string, listener: (...args: any[]) => void): this {
		return this.off(event, listener);
	}
}
