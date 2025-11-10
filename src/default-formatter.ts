import { format, inspect } from 'node:util';
import { isJSON } from './is-json.js';
import type { LogMessage, StyleHelpers } from './types.js';

/**
 * Formats each log message in the format "<uptime> <namespace> <method> <msg>".
 *
 * This is the default formatter used by SnoopLogg, but can be overridden by
 * passing a custom formatter function to the SnoopLogg constructor or the
 * config method.
 *
 * @param params - The formatter parameters.
 * @param params.args - The raw arguments passed to the log method.
 * @param params.colors - Whether to use colors in the log message.
 * @param params.elements - The log formatting elements.
 * @param params.method - The log method name.
 * @param params.ns - The namespace of the logger.
 * @param params.uptime - The uptime of the process.
 * @param styles - The ansi-styles module plus the nsToRgb function.
 * @returns The formatted log message.
 */
export function defaultFormatter(
	{ args, colors, elements, method, ns, uptime }: LogMessage,
	styles: StyleHelpers
): string {
	const prefix = `${elements.uptime(uptime, styles)} ${
		ns ? `${elements.namespace(ns, styles)} ` : ''
	}${method && method !== 'log' ? `${elements.method(method, styles)} ` : ''}`;

	const formattedArgs = args.map(it =>
		isJSON(it)
			? inspect(it, {
				breakLength: 0,
				colors,
				depth: 4,
				showHidden: false,
			})
			: it
	);

	for (let i = 0, len = formattedArgs.length; i < len; i++) {
		const arg = formattedArgs[i];
		if (arg instanceof Error) {
			formattedArgs[i] = elements.error(arg, styles);
		}
	}

	return format(...formattedArgs)
		.split('\n')
		.map(s => prefix + elements.message(s, method, styles))
		.join('\n');
}
