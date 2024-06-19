import type ansiStyles from 'ansi-styles';
import type { nsToRgb } from './ns-to-rgb.js';

export type WritableLike = {
	isTTY?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: Test case
	on: (...args: any[]) => any;
	// biome-ignore lint/suspicious/noExplicitAny: Test case
	removeListener: (...args: any[]) => any;
	writableObjectMode?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: Test case
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

export interface SnoopLoggConfig {
	elements?: LogElements;
	format?: LogFormatter | null;
	historySize?: number;
}

interface BaseLogMessage {
	args: unknown[];
	method: string;
	ns: string;
	ts: Date;
	uptime: number;
}

export interface LogMessage extends BaseLogMessage {
	elements: FormatLogElements;
}

export interface RawLogMessage extends BaseLogMessage {
	format?: LogFormatter | null;
	id: number;
	elements: LogElements;
	uptime: number;
}

export type Color = {
	r: number;
	g: number;
	b: number;
};
