/**
 * Lightweight EventEmitter-like class used for the global SnoopLogg message
 * bus.
 */
export class EventEmitter {
	private events: Record<string, ((...args: any[]) => void)[]> = {};

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

	on(event: string, listener: (...args: any[]) => void): this {
		if (!this.events[event]) {
			this.events[event] = [listener];
		} else {
			this.events[event].push(listener);
		}
		return this;
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
}
