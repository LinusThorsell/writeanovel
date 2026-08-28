import { describe, expect, it } from 'vitest';
import {
	createEmptyDrawing,
	drawingBoundsContainsPoint,
	drawingBoundsIntersect,
	drawingElementContainsPoint,
	drawingElementBounds,
	drawingToSvg,
	freehandSvgPath,
	shapeFromDrag,
	translateDrawingElement,
	translateDrawingElementInStack
} from './drawing';

describe('drawing domain', () => {
	it('creates a versioned square drawing without sharing mutable elements', () => {
		const first = createEmptyDrawing();
		const second = createEmptyDrawing();

		expect(first).toMatchObject({ version: 1, width: 1024, height: 1024, elements: [] });
		first.elements.push({
			id: 'line-1',
			type: 'line',
			stroke: '#000',
			strokeWidth: 10,
			x1: 0,
			y1: 0,
			x2: 10,
			y2: 10
		});
		expect(second.elements).toEqual([]);
	});

	it('renders freehand and geometric elements as self-contained SVG', () => {
		const drawing = createEmptyDrawing();
		drawing.elements = [
			{
				id: 'stroke-1',
				type: 'freehand',
				stroke: '#123456',
				strokeWidth: 18,
				points: [
					[10, 10, 0.3],
					[30, 25, 0.6],
					[50, 20, 0.8]
				]
			},
			shapeFromDrag(
				'rectangle',
				'rect-1',
				{ x: 80, y: 90 },
				{ x: 180, y: 220 },
				{ stroke: '#654321', strokeWidth: 8 }
			),
			shapeFromDrag(
				'ellipse',
				'ellipse-1',
				{ x: 240, y: 100 },
				{ x: 340, y: 200 },
				{ stroke: '#abcdef', strokeWidth: 6 }
			),
			shapeFromDrag(
				'line',
				'line-1',
				{ x: 20, y: 300 },
				{ x: 200, y: 300 },
				{ stroke: '#111111', strokeWidth: 5 }
			),
			{
				id: 'text-1',
				type: 'text',
				stroke: '#112233',
				strokeWidth: 1,
				x: 120,
				y: 420,
				text: `Harbor <script>alert('&')</script>`,
				fontSize: 42
			}
		];

		const svg = drawingToSvg(drawing);
		expect(svg).toContain('viewBox="0 0 1024 1024"');
		expect(svg).toContain('<path');
		expect(svg).toContain('<rect x="80" y="90" width="100" height="130"');
		expect(svg).toContain('<ellipse cx="290" cy="150" rx="50" ry="50"');
		expect(svg).toContain('<line x1="20" y1="300" x2="200" y2="300"');
		expect(svg).toContain(
			'<text x="120" y="420" fill="#112233" font-family="Arial, sans-serif" font-size="42">Harbor &lt;script&gt;alert(&apos;&amp;&apos;)&lt;/script&gt;</text>'
		);
		expect(svg).not.toContain('<script');
	});

	it('keeps perfect-freehand output stable and finite for pressure input', () => {
		const path = freehandSvgPath(
			[
				[0, 0, 0.2],
				[10, 12, 0.5],
				[30, 20, 0.9]
			],
			14
		);
		expect(path).toMatch(/^M.+Z$/);
		expect(path).not.toContain('NaN');
		expect(freehandSvgPath([[10, 10, 0.5]], 56)).toMatch(/^M.+Z$/);
	});

	it('partially erases earlier artwork without deleting vectors or affecting later artwork', () => {
		const drawing = createEmptyDrawing();
		drawing.elements = [
			shapeFromDrag(
				'line',
				'before-eraser',
				{ x: 20, y: 100 },
				{ x: 300, y: 100 },
				{ stroke: '#111111', strokeWidth: 12 }
			),
			{
				id: 'eraser-stroke',
				type: 'eraser',
				strokeWidth: 48,
				points: [
					[150, 60, 0.5],
					[150, 140, 0.5]
				]
			},
			shapeFromDrag(
				'line',
				'after-eraser',
				{ x: 20, y: 200 },
				{ x: 300, y: 200 },
				{ stroke: '#222222', strokeWidth: 12 }
			)
		];

		const svg = drawingToSvg(drawing);
		expect(svg.match(/<line /g)).toHaveLength(2);
		expect(svg.match(/<mask /g)).toHaveLength(1);
		expect(svg).toContain('<g id="drawing-state-input-0"><line');
		expect(svg).toContain(
			'<g id="drawing-state-0" mask="url(#drawing-eraser-mask-0)"><use href="#drawing-state-input-0" />'
		);
		expect(svg).toMatch(/<path d="M[^"]+" fill="black"/);
		expect(svg).toContain('y1="200"');
	});

	it('cuts and translates exactly the pixels inside a rectangular selection', () => {
		const drawing = createEmptyDrawing();
		drawing.elements = [
			shapeFromDrag(
				'line',
				'line',
				{ x: 10, y: 100 },
				{ x: 400, y: 100 },
				{ stroke: '#111111', strokeWidth: 12 }
			),
			{
				id: 'region-move',
				type: 'region-move',
				x: 100,
				y: 50,
				width: 120,
				height: 100,
				dx: 80,
				dy: 40
			}
		];

		const svg = drawingToSvg(drawing);
		expect(svg).toContain('<mask id="drawing-region-cut-0"');
		expect(svg).toContain('<rect x="100" y="50" width="120" height="100" fill="black"');
		expect(svg).toContain('<clipPath id="drawing-region-clip-0"');
		expect(svg).toContain('transform="translate(80 40)"');
		expect(svg).toContain('<use href="#drawing-state-input-0" />');
	});

	it('promotes a moved object above later canvas operations', () => {
		const rectangle = shapeFromDrag(
			'rectangle',
			'rect',
			{ x: 20, y: 20 },
			{ x: 120, y: 100 },
			{ stroke: '#000', strokeWidth: 8 }
		);
		const regionMove = {
			id: 'region-move',
			type: 'region-move' as const,
			x: 300,
			y: 300,
			width: 100,
			height: 100,
			dx: 100,
			dy: 0
		};
		const laterLine = shapeFromDrag(
			'line',
			'later-line',
			{ x: 200, y: 200 },
			{ x: 300, y: 200 },
			{ stroke: '#000', strokeWidth: 8 }
		);

		const moved = translateDrawingElementInStack(
			[rectangle, regionMove, laterLine],
			rectangle.id,
			300,
			300
		);
		expect(moved.map((element) => element.id)).toEqual([regionMove.id, laterLine.id, rectangle.id]);
		expect(moved.at(-1)).toMatchObject({ id: rectangle.id, x: 320, y: 320 });

		const withoutOperation = translateDrawingElementInStack(
			[rectangle, laterLine],
			rectangle.id,
			10,
			20
		);
		expect(withoutOperation.map((element) => element.id)).toEqual([rectangle.id, laterLine.id]);
	});

	it('constrains squares, circles, and straight lines from the same drag gesture', () => {
		const square = shapeFromDrag(
			'rectangle',
			'square',
			{ x: 20, y: 20 },
			{ x: 80, y: 50 },
			{ stroke: '#000', strokeWidth: 4 },
			true
		);
		const circle = shapeFromDrag(
			'ellipse',
			'circle',
			{ x: 100, y: 100 },
			{ x: 130, y: 180 },
			{ stroke: '#000', strokeWidth: 4 },
			true
		);
		const line = shapeFromDrag(
			'line',
			'line',
			{ x: 0, y: 0 },
			{ x: 99, y: 7 },
			{ stroke: '#000', strokeWidth: 4 },
			true
		);

		expect(square).toMatchObject({ type: 'rectangle', width: 60, height: 60 });
		expect(circle).toMatchObject({ type: 'ellipse', rx: 40, ry: 40 });
		expect(line.type === 'line' && line.y2).toBeCloseTo(0, 8);
	});

	it('finds and translates individual vector objects for selection', () => {
		const rectangle = shapeFromDrag(
			'rectangle',
			'rect',
			{ x: 20, y: 20 },
			{ x: 120, y: 100 },
			{ stroke: '#000', strokeWidth: 8 }
		);
		const line = shapeFromDrag(
			'line',
			'line',
			{ x: 200, y: 200 },
			{ x: 300, y: 200 },
			{ stroke: '#000', strokeWidth: 8 }
		);
		const text = {
			id: 'text',
			type: 'text' as const,
			stroke: '#000',
			strokeWidth: 1,
			x: 400,
			y: 300,
			text: 'Harbor',
			fontSize: 40
		};

		expect(drawingElementContainsPoint(rectangle, { x: 70, y: 60 })).toBe(true);
		expect(drawingElementContainsPoint(line, { x: 250, y: 208 })).toBe(true);
		expect(drawingElementContainsPoint(line, { x: 250, y: 260 })).toBe(false);
		expect(drawingElementContainsPoint(text, { x: 450, y: 280 })).toBe(true);
		expect(drawingElementContainsPoint(text, { x: 450, y: 360 })).toBe(false);

		const bounds = drawingElementBounds(rectangle);
		expect(bounds).toEqual({ x: 16, y: 16, width: 108, height: 88 });
		expect(bounds && drawingBoundsContainsPoint(bounds, { x: 70, y: 60 })).toBe(true);
		expect(drawingBoundsIntersect(bounds!, { x: 110, y: 80, width: 40, height: 40 })).toBe(true);
		expect(drawingBoundsIntersect(bounds!, { x: 200, y: 200, width: 40, height: 40 })).toBe(false);
		expect(translateDrawingElement(rectangle, 25, -10)).toMatchObject({
			type: 'rectangle',
			x: 45,
			y: 10,
			width: 100,
			height: 80
		});
	});
});
