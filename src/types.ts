import type ansiStyles from 'ansi-styles';
import type { nsToRgb } from './ns-to-rgb.js';

export interface WritableLike {
	isTTY?: boolean;
	on: (...args: any[]) => any;
	removeListener: (...args: any[]) => any;
	writableObjectMode?: boolean;
	write: (...args: any[]) => any;
};

export type LogFormatter = (msg: LogMessage, styles: StyleHelpers) => string;

export type StyleHelpers = typeof ansiStyles & { nsToRgb: typeof nsToRgb };

export type FormatLogElements = {
	error: (err: Error, styles: StyleHelpers) => string;
	message: (msg: string, method: string, styles: StyleHelpers) => string;
	method: (name: string, styles: StyleHelpers) => string;
	namespace: (ns: string, styles: StyleHelpers) => string;
	timestamp: (ts: Date, styles: StyleHelpers) => string;
	uptime: (uptime: number, styles: StyleHelpers) => string;
};

export type LogElements = Partial<FormatLogElements>;

export const LogLevels = {
	trace: 10,
	debug: 20,
	log: 30,
	info: 40,
	warn: 50,
	error: 60,
	panic: 70
} as const;

export type LogLevel = 'trace' | 'debug' | 'log' | 'info' | 'warn' | 'error' | 'panic';
export type LogLevelValue = (typeof LogLevels)[LogLevel];

export interface SnoopLoggConfig {
	colors?: boolean;
	elements?: LogElements;
	format?: LogFormatter | null;
	historySize?: number;
	logLevel?: LogLevel | LogLevelValue;
}

interface BaseLogMessage {
	args: unknown[];
	level: LogLevelValue;
	method: string;
	ns: string;
	ts: Date;
	uptime: number;
}

export interface LogMessage extends BaseLogMessage {
	colors: boolean;
	elements: FormatLogElements;
}

interface StreamBase {
	colors?: boolean;
	elements?: LogElements;
	format?: LogFormatter;
}

export interface StreamConfig extends StreamBase {
	onEnd?: () => void;
}

export interface StreamOptions extends StreamBase {
	flush?: boolean;
}

export interface RawLogMessage extends BaseLogMessage {
	id: number;
	uptime: number;
}

export type Color = {
	r: number;
	g: number;
	b: number;
};
