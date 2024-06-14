import type { Color } from './types.js';

type ColorDistance = {
	name: string;
	distance: number;
};

const colors: Record<string, Color> = {
	red: { r: 170, g: 0, b: 0 },
	green: { r: 0, g: 170, b: 0 },
	yellow: { r: 170, g: 85, b: 0 },
	blue: { r: 0, g: 0, b: 170 },
	magenta: { r: 170, g: 0, b: 170 },
	cyan: { r: 0, g: 170, b: 170 },
	brightBlack: { r: 85, g: 85, b: 85 },
	brightRed: { r: 255, g: 85, b: 85 },
	brightGreen: { r: 85, g: 255, b: 85 },
	brightYellow: { r: 255, g: 255, b: 85 },
	brightBlue: { r: 85, g: 85, b: 255 },
	brightMagenta: { r: 255, g: 85, b: 255 },
	brightCyan: { r: 85, g: 255, b: 255 }
};

export function closestRgb(color: Color): string | undefined {
	let closest: ColorDistance | undefined = undefined;

	for (const [name, ansiColor] of Object.entries(colors)) {
		const distance = Math.sqrt(
			Math.abs(color.r - ansiColor.r) * 0.3 ** 2 +
				Math.abs(color.g - ansiColor.g) * 0.59 ** 2 +
				Math.abs(color.b - ansiColor.b) * 0.11 ** 2
		);
		if (closest === undefined || distance < closest.distance) {
			closest = { name, distance };
		}
	}

	return closest?.name || 'white';
}
