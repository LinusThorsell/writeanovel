import { getStroke } from 'perfect-freehand';
import type {
	DrawingDocument,
	DrawingElement,
	DrawingPoint,
	EllipseDrawingElement,
	EraserDrawingElement,
	LineDrawingElement,
	RectangleDrawingElement
} from './types';

export const DRAWING_SIZE = 1_024;
export const DEFAULT_DRAWING_STROKE = '#243d33';
export const DEFAULT_DRAWING_STROKE_WIDTH = 12;

export type ShapeTool = 'line' | 'rectangle' | 'ellipse';

type DrawingStyle = {
	stroke: string;
	strokeWidth: number;
};

type DrawingPosition = { x: number; y: number };

function rounded(value: number, precision = 2): number {
	const multiplier = 10 ** precision;
	return Math.round(value * multiplier) / multiplier;
}

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function average(left: readonly number[], right: readonly number[]): [number, number] {
	return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
}

export function createEmptyDrawing(): DrawingDocument {
	return {
		version: 1,
		width: DRAWING_SIZE,
		height: DRAWING_SIZE,
		background: '#fffefa',
		elements: []
	};
}

export function freehandSvgPath(points: DrawingPoint[], strokeWidth: number): string {
	if (points.length === 0) return '';
	const hasRealPressure = points.some((point) => Math.abs(point[2] - 0.5) > 0.02);
	const outline = getStroke(points, {
		size: strokeWidth,
		thinning: 0.58,
		smoothing: 0.62,
		streamline: 0.48,
		simulatePressure: !hasRealPressure,
		last: true
	});
	if (outline.length < 4) return '';

	const first = outline[0];
	const second = outline[1];
	const third = outline[2];
	const firstAverage = average(second, third);
	let path = `M${rounded(first[0])},${rounded(first[1])} Q${rounded(second[0])},${rounded(second[1])} ${rounded(firstAverage[0])},${rounded(firstAverage[1])} T`;

	for (let index = 2; index < outline.length - 1; index += 1) {
		const midpoint = average(outline[index], outline[index + 1]);
		path += `${rounded(midpoint[0])},${rounded(midpoint[1])} `;
	}
	return `${path}Z`;
}

function elementSvg(element: DrawingElement): string {
	const strokeWidth = rounded(element.strokeWidth);
	switch (element.type) {
		case 'freehand':
			return `<path d="${freehandSvgPath(element.points, element.strokeWidth)}" fill="${escapeXml(element.stroke)}" />`;
		case 'line':
			return `<line x1="${rounded(element.x1)}" y1="${rounded(element.y1)}" x2="${rounded(element.x2)}" y2="${rounded(element.y2)}" fill="none" stroke="${escapeXml(element.stroke)}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;
		case 'rectangle':
			return `<rect x="${rounded(element.x)}" y="${rounded(element.y)}" width="${rounded(element.width)}" height="${rounded(element.height)}" fill="none" stroke="${escapeXml(element.stroke)}" stroke-width="${strokeWidth}" stroke-linejoin="round" />`;
		case 'ellipse':
			return `<ellipse cx="${rounded(element.cx)}" cy="${rounded(element.cy)}" rx="${rounded(element.rx)}" ry="${rounded(element.ry)}" fill="none" stroke="${escapeXml(element.stroke)}" stroke-width="${strokeWidth}" />`;
		case 'text':
			return `<text x="${rounded(element.x)}" y="${rounded(element.y)}" fill="${escapeXml(element.stroke)}" font-family="Arial, sans-serif" font-size="${rounded(element.fontSize)}">${escapeXml(element.text)}</text>`;
		case 'eraser':
			return '';
	}
}

function eraserMaskSvg(
	id: string,
	erasers: EraserDrawingElement[],
	width: number,
	height: number
): string {
	return [
		`<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${rounded(width)}" height="${rounded(height)}" style="mask-type:luminance">`,
		`<rect width="100%" height="100%" fill="white" />`,
		...erasers.map(
			(eraser) => `<path d="${freehandSvgPath(eraser.points, eraser.strokeWidth)}" fill="black" />`
		),
		'</mask>'
	].join('');
}

export function drawingToSvg(drawing: DrawingDocument): string {
	const width = Math.max(1, drawing.width);
	const height = Math.max(1, drawing.height);
	const masks: string[] = [];
	const content: string[] = [];
	drawing.elements.forEach((element, index) => {
		if (element.type === 'eraser') return;
		const erasers = drawing.elements
			.slice(index + 1)
			.filter((candidate): candidate is EraserDrawingElement => candidate.type === 'eraser');
		const svg = elementSvg(element);
		if (erasers.length === 0) {
			content.push(svg);
			return;
		}
		const maskId = `drawing-eraser-mask-${index}`;
		masks.push(eraserMaskSvg(maskId, erasers, width, height));
		content.push(`<g mask="url(#${maskId})">${svg}</g>`);
	});
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rounded(width)} ${rounded(height)}" width="${rounded(width)}" height="${rounded(height)}">`,
		`<rect width="100%" height="100%" fill="${escapeXml(drawing.background)}" />`,
		...(masks.length > 0 ? [`<defs>${masks.join('')}</defs>`] : []),
		...content,
		'</svg>'
	].join('');
}

export function drawingToSvgBlob(drawing: DrawingDocument): Blob {
	return new Blob([drawingToSvg(drawing)], { type: 'image/svg+xml' });
}

function constrainedEnd(start: DrawingPosition, end: DrawingPosition): DrawingPosition {
	const deltaX = end.x - start.x;
	const deltaY = end.y - start.y;
	const side = Math.max(Math.abs(deltaX), Math.abs(deltaY));
	return {
		x: start.x + Math.sign(deltaX || 1) * side,
		y: start.y + Math.sign(deltaY || 1) * side
	};
}

function snappedLineEnd(start: DrawingPosition, end: DrawingPosition): DrawingPosition {
	const deltaX = end.x - start.x;
	const deltaY = end.y - start.y;
	const distance = Math.hypot(deltaX, deltaY);
	const increment = Math.PI / 12;
	const angle = Math.round(Math.atan2(deltaY, deltaX) / increment) * increment;
	return { x: start.x + Math.cos(angle) * distance, y: start.y + Math.sin(angle) * distance };
}

export function shapeFromDrag(
	tool: ShapeTool,
	id: string,
	start: DrawingPosition,
	end: DrawingPosition,
	style: DrawingStyle,
	constrained = false
): LineDrawingElement | RectangleDrawingElement | EllipseDrawingElement {
	const finalEnd = constrained
		? tool === 'line'
			? snappedLineEnd(start, end)
			: constrainedEnd(start, end)
		: end;
	const base = { id, stroke: style.stroke, strokeWidth: style.strokeWidth };

	if (tool === 'line') {
		return { ...base, type: 'line', x1: start.x, y1: start.y, x2: finalEnd.x, y2: finalEnd.y };
	}

	const x = Math.min(start.x, finalEnd.x);
	const y = Math.min(start.y, finalEnd.y);
	const width = Math.abs(finalEnd.x - start.x);
	const height = Math.abs(finalEnd.y - start.y);
	if (tool === 'rectangle') return { ...base, type: 'rectangle', x, y, width, height };
	return {
		...base,
		type: 'ellipse',
		cx: x + width / 2,
		cy: y + height / 2,
		rx: width / 2,
		ry: height / 2
	};
}

function distanceToSegment(
	point: DrawingPosition,
	start: DrawingPosition,
	end: DrawingPosition
): number {
	const deltaX = end.x - start.x;
	const deltaY = end.y - start.y;
	const lengthSquared = deltaX * deltaX + deltaY * deltaY;
	if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
	const ratio = Math.max(
		0,
		Math.min(1, ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared)
	);
	return Math.hypot(point.x - (start.x + ratio * deltaX), point.y - (start.y + ratio * deltaY));
}

export function drawingElementContainsPoint(
	element: DrawingElement,
	point: DrawingPosition,
	tolerance = 14
): boolean {
	const hitWidth = tolerance + element.strokeWidth / 2;
	switch (element.type) {
		case 'freehand':
		case 'eraser':
			return element.points.some((candidate, index) => {
				const next = element.points[index + 1];
				return next
					? distanceToSegment(
							point,
							{ x: candidate[0], y: candidate[1] },
							{ x: next[0], y: next[1] }
						) <= hitWidth
					: Math.hypot(point.x - candidate[0], point.y - candidate[1]) <= hitWidth;
			});
		case 'line':
			return (
				distanceToSegment(
					point,
					{ x: element.x1, y: element.y1 },
					{ x: element.x2, y: element.y2 }
				) <= hitWidth
			);
		case 'rectangle':
			return (
				point.x >= element.x - hitWidth &&
				point.x <= element.x + element.width + hitWidth &&
				point.y >= element.y - hitWidth &&
				point.y <= element.y + element.height + hitWidth
			);
		case 'ellipse': {
			const rx = element.rx + hitWidth;
			const ry = element.ry + hitWidth;
			if (rx <= 0 || ry <= 0) return false;
			const x = (point.x - element.cx) / rx;
			const y = (point.y - element.cy) / ry;
			return x * x + y * y <= 1;
		}
		case 'text': {
			const width = Math.max(
				element.fontSize * 0.6,
				[...element.text].length * element.fontSize * 0.6
			);
			return (
				point.x >= element.x - tolerance &&
				point.x <= element.x + width + tolerance &&
				point.y >= element.y - element.fontSize - tolerance &&
				point.y <= element.y + element.fontSize * 0.25 + tolerance
			);
		}
	}
}
