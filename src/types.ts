export type SnoopLoggStyle = {
	ns?: (ns: string) => string;
};

export type LogFormatter = (msg: LogMessage) => string;

export type FormatLogStyles = {
	message: (msg: string, method: string) => string;
	method: (name: string) => string;
	namespace: (ns: string) => string;
	timestamp: (ts: Date) => string;
};

export type LogStyles = Partial<FormatLogStyles>;

export interface LoggerOptions {
	format?: LogFormatter | null;
	style?: LogStyles;
}

export interface SnoopLoggOptions extends LoggerOptions {
	maxBufferSize?: number;
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
