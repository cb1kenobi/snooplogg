import type ansiStyles from 'ansi-styles';

export type SnoopLoggStyle = {
	ns?: (ns: string) => string;
};

export type LogFormatter = (msg: LogMessage, styles: AnsiStyles) => string;

export type AnsiStyles = typeof ansiStyles;

export type FormatLogStyles = {
	error: (err: Error, styles: AnsiStyles) => string;
	message: (msg: string, method: string, styles: AnsiStyles) => string;
	method: (name: string, styles: AnsiStyles) => string;
	namespace: (ns: string, styles: AnsiStyles) => string;
	timestamp: (ts: Date, styles: AnsiStyles) => string;
};

export type LogStyles = Partial<FormatLogStyles>;

export interface LoggerOptions {
	format?: LogFormatter | null;
	style?: LogStyles;
}

export interface SnoopLoggOptions extends LoggerOptions {
	historySize?: number;
}

interface BaseLogMessage {
	args: unknown[];
	method: string;
	ns: string;
	ts: Date;
}

export interface LogMessage extends BaseLogMessage {
	style: FormatLogStyles;
}

export interface RawLogMessage extends BaseLogMessage {
	format?: LogFormatter | null;
	id: number;
	style: LogStyles;
}

export type SnoopLoggStreamMeta = {
	onEnd: () => void;
};

export type Color = {
	r: number;
	g: number;
	b: number;
};
