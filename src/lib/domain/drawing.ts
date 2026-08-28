import { getStroke } from 'perfect-freehand';
import type {
	DrawingDocument,
	DrawingElement,
	DrawingPoint,
	EllipseDrawingElement,
	EraserDrawingElement,
	LineDrawingElement,
	RectangleDrawingElement,
	RegionMoveDrawingElement
} from './types';

export const DRAWING_SIZE = 1_024;
export const DEFAULT_DRAWING_STROKE = '#243d33';
export const DEFAULT_DRAWING_STROKE_WIDTH = 12;

export type ShapeTool = 'line' | 'rectangle' | 'ellipse';

type DrawingStyle = {
	stroke: string;
	strokeWidth: number;
};

export type DrawingPosition = { x: number; y: number };
export type DrawingBounds = DrawingPosition & { width: number; height: number };
export type DrawableDrawingElement = Exclude<
	DrawingElement,
	EraserDrawingElement | RegionMoveDrawingElement
>;

export type DrawingRenderStage = {
	index: number;
	inputId: string;
	outputId: string;
	previousStateId?: string;
	drawables: DrawableDrawingElement[];
	operation: EraserDrawingElement | RegionMoveDrawingElement;
};

export type DrawingRenderPlan = {
	stages: DrawingRenderStage[];
	finalStateId?: string;
	finalDrawables: DrawableDrawingElement[];
};

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

function elementSvg(element: DrawableDrawingElement): string {
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
	}
}

export function drawingRenderPlan(elements: DrawingElement[]): DrawingRenderPlan {
	const stages: DrawingRenderStage[] = [];
	let drawables: DrawableDrawingElement[] = [];
	let previousStateId: string | undefined;

	for (const element of elements) {
		if (element.type !== 'eraser' && element.type !== 'region-move') {
			drawables.push(element);
			continue;
		}

		const index = stages.length;
		const outputId = `drawing-state-${index}`;
		stages.push({
			index,
			inputId: `drawing-state-input-${index}`,
			outputId,
			previousStateId,
			drawables,
			operation: element
		});
		previousStateId = outputId;
		drawables = [];
	}

	return { stages, finalStateId: previousStateId, finalDrawables: drawables };
}

function renderStage(stage: DrawingRenderStage, width: number, height: number): string {
	const priorArtwork = [
		stage.previousStateId ? `<use href="#${stage.previousStateId}" />` : '',
		...stage.drawables.map(elementSvg)
	].join('');
	const input = `<g id="${stage.inputId}">${priorArtwork}</g>`;

	if (stage.operation.type === 'eraser') {
		const maskId = `drawing-eraser-mask-${stage.index}`;
		return [
			input,
			`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${rounded(width)}" height="${rounded(height)}" style="mask-type:luminance">`,
			'<rect width="100%" height="100%" fill="white" />',
			`<path d="${freehandSvgPath(stage.operation.points, stage.operation.strokeWidth)}" fill="black" />`,
			'</mask>',
			`<g id="${stage.outputId}" mask="url(#${maskId})"><use href="#${stage.inputId}" /></g>`
		].join('');
	}

	const operation = stage.operation;
	const cutMaskId = `drawing-region-cut-${stage.index}`;
	const clipId = `drawing-region-clip-${stage.index}`;
	return [
		input,
		`<mask id="${cutMaskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${rounded(width)}" height="${rounded(height)}" style="mask-type:luminance">`,
		'<rect width="100%" height="100%" fill="white" />',
		`<rect x="${rounded(operation.x)}" y="${rounded(operation.y)}" width="${rounded(operation.width)}" height="${rounded(operation.height)}" fill="black" />`,
		'</mask>',
		`<clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="${rounded(operation.x)}" y="${rounded(operation.y)}" width="${rounded(operation.width)}" height="${rounded(operation.height)}" /></clipPath>`,
		`<g id="${stage.outputId}">`,
		`<g mask="url(#${cutMaskId})"><use href="#${stage.inputId}" /></g>`,
		`<g transform="translate(${rounded(operation.dx)} ${rounded(operation.dy)})"><g clip-path="url(#${clipId})"><use href="#${stage.inputId}" /></g></g>`,
		'</g>'
	].join('');
}

export function drawingToSvg(drawing: DrawingDocument): string {
	const width = Math.max(1, drawing.width);
	const height = Math.max(1, drawing.height);
	const plan = drawingRenderPlan(drawing.elements);
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rounded(width)} ${rounded(height)}" width="${rounded(width)}" height="${rounded(height)}">`,
		`<rect width="100%" height="100%" fill="${escapeXml(drawing.background)}" />`,
		...(plan.stages.length > 0
			? [`<defs>${plan.stages.map((stage) => renderStage(stage, width, height)).join('')}</defs>`]
			: []),
		...(plan.finalStateId ? [`<use href="#${plan.finalStateId}" />`] : []),
		...plan.finalDrawables.map(elementSvg),
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

export function drawingBoundsFromPoints(
	start: DrawingPosition,
	end: DrawingPosition
): DrawingBounds {
	return {
		x: Math.min(start.x, end.x),
		y: Math.min(start.y, end.y),
		width: Math.abs(end.x - start.x),
		height: Math.abs(end.y - start.y)
	};
}

export function drawingBoundsContainsPoint(bounds: DrawingBounds, point: DrawingPosition): boolean {
	return (
		point.x >= bounds.x &&
		point.x <= bounds.x + bounds.width &&
		point.y >= bounds.y &&
		point.y <= bounds.y + bounds.height
	);
}

export function drawingBoundsIntersect(left: DrawingBounds, right: DrawingBounds): boolean {
	return (
		left.x <= right.x + right.width &&
		left.x + left.width >= right.x &&
		left.y <= right.y + right.height &&
		left.y + left.height >= right.y
	);
}

export function drawingElementBounds(element: DrawingElement): DrawingBounds | undefined {
	const padding = 'strokeWidth' in element ? element.strokeWidth / 2 : 0;
	switch (element.type) {
		case 'freehand': {
			if (element.points.length === 0) return undefined;
			const xs = element.points.map((point) => point[0]);
			const ys = element.points.map((point) => point[1]);
			const x = Math.min(...xs) - padding;
			const y = Math.min(...ys) - padding;
			return {
				x,
				y,
				width: Math.max(...xs) + padding - x,
				height: Math.max(...ys) + padding - y
			};
		}
		case 'line': {
			const x = Math.min(element.x1, element.x2) - padding;
			const y = Math.min(element.y1, element.y2) - padding;
			return {
				x,
				y,
				width: Math.max(element.x1, element.x2) + padding - x,
				height: Math.max(element.y1, element.y2) + padding - y
			};
		}
		case 'rectangle':
			return {
				x: element.x - padding,
				y: element.y - padding,
				width: element.width + padding * 2,
				height: element.height + padding * 2
			};
		case 'ellipse':
			return {
				x: element.cx - element.rx - padding,
				y: element.cy - element.ry - padding,
				width: element.rx * 2 + padding * 2,
				height: element.ry * 2 + padding * 2
			};
		case 'text':
			return {
				x: element.x,
				y: element.y - element.fontSize,
				width: Math.max(element.fontSize * 0.6, [...element.text].length * element.fontSize * 0.6),
				height: element.fontSize * 1.25
			};
		case 'eraser':
		case 'region-move':
			return undefined;
	}
}

export function drawingOperationBounds(element: DrawingElement): DrawingBounds | undefined {
	if (element.type === 'region-move') {
		return { x: element.x, y: element.y, width: element.width, height: element.height };
	}
	if (element.type !== 'eraser' || element.points.length === 0) return undefined;
	const padding = element.strokeWidth / 2;
	const xs = element.points.map((point) => point[0]);
	const ys = element.points.map((point) => point[1]);
	const x = Math.min(...xs) - padding;
	const y = Math.min(...ys) - padding;
	return {
		x,
		y,
		width: Math.max(...xs) + padding - x,
		height: Math.max(...ys) + padding - y
	};
}

export function translateDrawingElement(
	element: DrawingElement,
	dx: number,
	dy: number
): DrawingElement {
	switch (element.type) {
		case 'freehand':
			return {
				...element,
				points: element.points.map(([x, y, pressure]) => [x + dx, y + dy, pressure])
			};
		case 'line':
			return {
				...element,
				x1: element.x1 + dx,
				y1: element.y1 + dy,
				x2: element.x2 + dx,
				y2: element.y2 + dy
			};
		case 'rectangle':
			return { ...element, x: element.x + dx, y: element.y + dy };
		case 'ellipse':
			return { ...element, cx: element.cx + dx, cy: element.cy + dy };
		case 'text':
			return { ...element, x: element.x + dx, y: element.y + dy };
		case 'eraser':
		case 'region-move':
			return element;
	}
}

export function translateDrawingElementInStack(
	elements: DrawingElement[],
	elementId: string,
	dx: number,
	dy: number
): DrawingElement[] {
	const index = elements.findIndex((element) => element.id === elementId);
	if (index < 0) return elements;
	const translated = translateDrawingElement(elements[index], dx, dy);
	const hasLaterCompositingOperation = elements
		.slice(index + 1)
		.some((element) => element.type === 'eraser' || element.type === 'region-move');
	if (!hasLaterCompositingOperation) {
		return elements.map((element, elementIndex) => (elementIndex === index ? translated : element));
	}

	return [...elements.slice(0, index), ...elements.slice(index + 1), translated];
}

export function drawingElementContainsPoint(
	element: DrawingElement,
	point: DrawingPosition,
	tolerance = 14
): boolean {
	switch (element.type) {
		case 'freehand':
		case 'eraser': {
			const hitWidth = tolerance + element.strokeWidth / 2;
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
		}
		case 'line': {
			const hitWidth = tolerance + element.strokeWidth / 2;
			return (
				distanceToSegment(
					point,
					{ x: element.x1, y: element.y1 },
					{ x: element.x2, y: element.y2 }
				) <= hitWidth
			);
		}
		case 'rectangle': {
			const hitWidth = tolerance + element.strokeWidth / 2;
			return (
				point.x >= element.x - hitWidth &&
				point.x <= element.x + element.width + hitWidth &&
				point.y >= element.y - hitWidth &&
				point.y <= element.y + element.height + hitWidth
			);
		}
		case 'ellipse': {
			const hitWidth = tolerance + element.strokeWidth / 2;
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
		case 'region-move':
			return false;
	}
}
