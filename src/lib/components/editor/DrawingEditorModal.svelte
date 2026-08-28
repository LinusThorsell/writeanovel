<script lang="ts">
	import {
		Circle,
		Eraser,
		Minus,
		MousePointer2,
		PenLine,
		Redo2,
		Save,
		Square,
		Trash2,
		Type,
		Undo2
	} from '@lucide/svelte';
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import Modal from '$lib/components/ui/Modal.svelte';
	import {
		DEFAULT_DRAWING_STROKE,
		DEFAULT_DRAWING_STROKE_WIDTH,
		drawingBoundsContainsPoint,
		drawingBoundsFromPoints,
		drawingBoundsIntersect,
		drawingElementBounds,
		drawingElementContainsPoint,
		drawingOperationBounds,
		drawingRenderPlan,
		freehandSvgPath,
		shapeFromDrag,
		translateDrawingElementInStack,
		type DrawableDrawingElement,
		type DrawingBounds,
		type DrawingPosition,
		type ShapeTool
	} from '$lib/domain/drawing';
	import type {
		DrawingDocument,
		DrawingElement,
		DrawingPoint,
		FreehandDrawingElement,
		RegionMoveDrawingElement,
		TextDrawingElement
	} from '$lib/domain/types';

	type DrawingTool = 'select' | 'freehand' | ShapeTool | 'text' | 'eraser';
	type CanvasSelection =
		{ kind: 'object'; elementId: string } | { kind: 'region'; bounds: DrawingBounds };
	type SelectionGesture = {
		mode: 'marquee' | 'move-object' | 'move-region';
		start: DrawingPosition;
		baselineElements: DrawingElement[];
		initialSelection?: CanvasSelection;
		elementId?: string;
		sourceBounds?: DrawingBounds;
	};

	type TextDraft = Pick<
		TextDrawingElement,
		'id' | 'x' | 'y' | 'stroke' | 'strokeWidth' | 'fontSize'
	> & { selectOnFocus: boolean };

	type Props = {
		drawing: DrawingDocument;
		saving: boolean;
		onSave: (drawing: DrawingDocument) => Promise<void>;
		onClose: () => void;
	};

	let { drawing, saving, onSave, onClose }: Props = $props();
	const startingDrawing = untrack(() => structuredClone(drawing));
	let elements = $state.raw<DrawingElement[]>(startingDrawing.elements);
	let preview = $state.raw<DrawingElement>();
	let undoStack = $state.raw<DrawingElement[][]>([]);
	let redoStack = $state.raw<DrawingElement[][]>([]);
	let tool = $state<DrawingTool>('freehand');
	let stroke = $state(DEFAULT_DRAWING_STROKE);
	let strokeWidth = $state(DEFAULT_DRAWING_STROKE_WIDTH);
	let eraserWidth = $state(56);
	let fontSize = $state(42);
	let textDraft = $state.raw<TextDraft>();
	let textValue = $state('');
	let selection = $state.raw<CanvasSelection>();
	let selectionGesture = $state.raw<SelectionGesture>();
	let activePointerId: number | undefined;
	let gestureStart: { x: number; y: number } | undefined;
	let gestureElements: DrawingElement[] | undefined;
	let gestureElementId: string | undefined;
	const visibleElements = $derived(preview ? [...elements, preview] : elements);
	const renderPlan = $derived(drawingRenderPlan(visibleElements));
	const selectionBounds = $derived.by(() => {
		const currentSelection = selection;
		if (!currentSelection) return undefined;
		if (currentSelection.kind === 'region') return currentSelection.bounds;
		const element = elements.find((candidate) => candidate.id === currentSelection.elementId);
		return element ? drawingElementBounds(element) : undefined;
	});

	function cloneElements(value: DrawingElement[]): DrawingElement[] {
		return structuredClone(value);
	}

	function eventPoint(event: PointerEvent, surface: SVGSVGElement): DrawingPoint {
		const bounds = surface.getBoundingClientRect();
		const pressure = event.pressure > 0 ? event.pressure : 0.5;
		return [
			Math.max(
				0,
				Math.min(
					startingDrawing.width,
					((event.clientX - bounds.left) / bounds.width) * startingDrawing.width
				)
			),
			Math.max(
				0,
				Math.min(
					startingDrawing.height,
					((event.clientY - bounds.top) / bounds.height) * startingDrawing.height
				)
			),
			pressure
		];
	}

	function pointPosition(point: DrawingPoint): DrawingPosition {
		return { x: point[0], y: point[1] };
	}

	function regionDestination(element: RegionMoveDrawingElement): DrawingBounds {
		return {
			x: element.x + element.dx,
			y: element.y + element.dy,
			width: element.width,
			height: element.height
		};
	}

	function elementAffectedByLaterOperation(element: DrawingElement, index: number): boolean {
		const elementBounds = drawingElementBounds(element);
		if (!elementBounds) return false;
		return elements.slice(index + 1).some((candidate) => {
			const operationBounds = drawingOperationBounds(candidate);
			return operationBounds ? drawingBoundsIntersect(elementBounds, operationBounds) : false;
		});
	}

	function findSelectableElement(point: DrawingPosition): DrawingElement | undefined {
		for (let index = elements.length - 1; index >= 0; index -= 1) {
			const element = elements[index];
			if (element.type === 'eraser' || element.type === 'region-move') continue;
			// Erasing or rectangular movement flattens the pixels it touches. Mutating an earlier
			// vector would recalculate that historical operation and corrupt its detached pixels.
			if (elementAffectedByLaterOperation(element, index)) continue;
			const coveredByLaterRegion = elements
				.slice(index + 1)
				.some(
					(candidate) =>
						candidate.type === 'region-move' &&
						(drawingBoundsContainsPoint(candidate, point) ||
							drawingBoundsContainsPoint(regionDestination(candidate), point))
				);
			if (!coveredByLaterRegion && drawingElementContainsPoint(element, point, 10)) return element;
		}
		return undefined;
	}

	function startSelection(point: DrawingPosition, forceMarquee = false): void {
		const baselineElements = cloneElements(elements);
		const initialSelection = selection ? structuredClone(selection) : undefined;
		if (forceMarquee) {
			selection = { kind: 'region', bounds: { x: point.x, y: point.y, width: 0, height: 0 } };
			selectionGesture = {
				mode: 'marquee',
				start: point,
				baselineElements,
				initialSelection
			};
			return;
		}

		if (selection?.kind === 'region' && drawingBoundsContainsPoint(selection.bounds, point)) {
			selectionGesture = {
				mode: 'move-region',
				start: point,
				baselineElements,
				initialSelection,
				sourceBounds: { ...selection.bounds }
			};
			return;
		}

		const selectedElement = findSelectableElement(point);
		if (selectedElement) {
			selection = { kind: 'object', elementId: selectedElement.id };
			selectionGesture = {
				mode: 'move-object',
				start: point,
				baselineElements,
				initialSelection,
				elementId: selectedElement.id
			};
			return;
		}

		selection = { kind: 'region', bounds: { x: point.x, y: point.y, width: 0, height: 0 } };
		selectionGesture = {
			mode: 'marquee',
			start: point,
			baselineElements,
			initialSelection
		};
	}

	function continueSelection(point: DrawingPosition): void {
		const gesture = selectionGesture;
		if (!gesture) return;
		if (gesture.mode === 'marquee') {
			selection = { kind: 'region', bounds: drawingBoundsFromPoints(gesture.start, point) };
			return;
		}

		const rawDx = point.x - gesture.start.x;
		const rawDy = point.y - gesture.start.y;
		if (gesture.mode === 'move-object' && gesture.elementId) {
			elements = translateDrawingElementInStack(
				gesture.baselineElements,
				gesture.elementId,
				rawDx,
				rawDy
			);
			return;
		}

		if (gesture.mode === 'move-region' && gesture.sourceBounds && gestureElementId) {
			const source = gesture.sourceBounds;
			const dx = Math.max(
				-source.x,
				Math.min(startingDrawing.width - source.x - source.width, rawDx)
			);
			const dy = Math.max(
				-source.y,
				Math.min(startingDrawing.height - source.y - source.height, rawDy)
			);
			preview = {
				id: gestureElementId,
				type: 'region-move',
				x: source.x,
				y: source.y,
				width: source.width,
				height: source.height,
				dx,
				dy
			};
			selection = {
				kind: 'region',
				bounds: { ...source, x: source.x + dx, y: source.y + dy }
			};
		}
	}

	function finishSelection(): void {
		const gesture = selectionGesture;
		if (!gesture) return;

		if (gesture.mode === 'marquee') {
			if (selection?.kind !== 'region' || selection.bounds.width < 4 || selection.bounds.height < 4)
				selection = undefined;
		} else if (gesture.mode === 'move-object') {
			if (JSON.stringify(elements) !== JSON.stringify(gesture.baselineElements)) {
				undoStack = [...undoStack, gesture.baselineElements];
				redoStack = [];
			}
		} else if (
			preview?.type === 'region-move' &&
			(Math.abs(preview.dx) > 1 || Math.abs(preview.dy) > 1)
		) {
			undoStack = [...undoStack, gesture.baselineElements];
			redoStack = [];
			elements = [...gesture.baselineElements, preview];
		}
		preview = undefined;
		selectionGesture = undefined;
	}

	function resetPointerGesture(): void {
		activePointerId = undefined;
		gestureStart = undefined;
		gestureElements = undefined;
		gestureElementId = undefined;
	}

	function startDrawing(event: PointerEvent): void {
		if (event.button !== 0) return;
		if (tool === 'text') return;
		const surface = event.currentTarget as SVGSVGElement;
		const point = eventPoint(event, surface);

		surface.setPointerCapture(event.pointerId);
		activePointerId = event.pointerId;
		gestureStart = { x: point[0], y: point[1] };
		gestureElements = cloneElements(elements);
		gestureElementId = crypto.randomUUID();
		if (tool === 'select') {
			startSelection(pointPosition(point), event.shiftKey);
			return;
		}

		if (tool === 'eraser') {
			preview = {
				id: gestureElementId,
				type: 'eraser',
				strokeWidth: eraserWidth,
				points: [point]
			};
			return;
		}
		if (tool === 'freehand') {
			preview = {
				id: gestureElementId,
				type: 'freehand',
				stroke,
				strokeWidth,
				points: [point]
			};
			return;
		}
		preview = shapeFromDrag(tool, gestureElementId, gestureStart, gestureStart, {
			stroke,
			strokeWidth
		});
	}

	function continueDrawing(event: PointerEvent): void {
		if (event.pointerId !== activePointerId || !gestureStart || !gestureElementId) return;
		const surface = event.currentTarget as SVGSVGElement;
		if (tool === 'select') {
			continueSelection(pointPosition(eventPoint(event, surface)));
			return;
		}
		if (preview?.type === 'freehand' || preview?.type === 'eraser') {
			const events = event.getCoalescedEvents?.() ?? [event];
			const nextPoints = events.map((candidate) => eventPoint(candidate, surface));
			preview = { ...preview, points: [...preview.points, ...nextPoints] };
			return;
		}
		if (tool === 'line' || tool === 'rectangle' || tool === 'ellipse') {
			const point = eventPoint(event, surface);
			preview = shapeFromDrag(
				tool,
				gestureElementId,
				gestureStart,
				{ x: point[0], y: point[1] },
				{ stroke, strokeWidth },
				event.shiftKey
			);
		}
	}

	function finishDrawing(event: PointerEvent): void {
		if (tool === 'text') {
			beginTextEditing(eventPoint(event, event.currentTarget as SVGSVGElement));
			return;
		}
		if (event.pointerId !== activePointerId) return;
		const surface = event.currentTarget as SVGSVGElement;
		if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
		if (tool === 'select') {
			finishSelection();
			resetPointerGesture();
			return;
		}

		if (preview && gestureElements) {
			const shouldCommit =
				preview.type === 'freehand' || preview.type === 'eraser'
					? preview.points.length > 0
					: preview.type === 'line'
						? Math.hypot(preview.x2 - preview.x1, preview.y2 - preview.y1) > 2
						: preview.type === 'rectangle'
							? preview.width > 2 && preview.height > 2
							: preview.type === 'ellipse'
								? preview.rx > 1 && preview.ry > 1
								: false;
			if (shouldCommit) {
				undoStack = [...undoStack, gestureElements];
				redoStack = [];
				elements = [...elements, preview];
			}
		}

		preview = undefined;
		resetPointerGesture();
	}

	function cancelGesture(event: PointerEvent): void {
		if (event.pointerId !== activePointerId) return;
		if (selectionGesture) selection = selectionGesture.initialSelection;
		if (gestureElements) elements = gestureElements;
		preview = undefined;
		selectionGesture = undefined;
		resetPointerGesture();
	}

	function undo(): void {
		const previous = undoStack.at(-1);
		if (!previous) return;
		redoStack = [...redoStack, cloneElements(elements)];
		elements = cloneElements(previous);
		undoStack = undoStack.slice(0, -1);
		selection = undefined;
	}

	function redo(): void {
		const next = redoStack.at(-1);
		if (!next) return;
		undoStack = [...undoStack, cloneElements(elements)];
		elements = cloneElements(next);
		redoStack = redoStack.slice(0, -1);
		selection = undefined;
	}

	function beginTextEditing(point: DrawingPoint): void {
		commitText();
		const existing = [...elements]
			.reverse()
			.find(
				(element) =>
					element.type === 'text' &&
					drawingElementContainsPoint(element, { x: point[0], y: point[1] }, 10)
			) as TextDrawingElement | undefined;

		if (existing) {
			stroke = existing.stroke;
			fontSize = existing.fontSize;
			textValue = existing.text;
			textDraft = {
				id: existing.id,
				x: existing.x,
				y: existing.y,
				stroke: existing.stroke,
				strokeWidth: existing.strokeWidth,
				fontSize: existing.fontSize,
				selectOnFocus: true
			};
		} else {
			textValue = '';
			textDraft = {
				id: crypto.randomUUID(),
				x: Math.min(point[0], startingDrawing.width - 80),
				y: Math.max(fontSize, Math.min(point[1], startingDrawing.height - fontSize * 0.25)),
				stroke,
				strokeWidth: 1,
				fontSize,
				selectOnFocus: false
			};
		}
	}

	function focusTextInput(selectOnFocus: boolean): Attachment<HTMLInputElement> {
		return (element) => {
			element.focus();
			if (selectOnFocus) element.select();
		};
	}

	function commitText(): void {
		const draft = textDraft;
		if (!draft) return;
		textDraft = undefined;
		const value = textValue.trim();
		const existingIndex = elements.findIndex(
			(element) => element.type === 'text' && element.id === draft.id
		);
		const { selectOnFocus: _, ...elementFields } = draft;
		const nextElement: TextDrawingElement = { ...elementFields, type: 'text', text: value };
		const nextElements =
			existingIndex >= 0
				? value
					? elements.map((element, index) => (index === existingIndex ? nextElement : element))
					: elements.filter((_, index) => index !== existingIndex)
				: value
					? [...elements, nextElement]
					: elements;

		if (JSON.stringify(nextElements) !== JSON.stringify(elements)) {
			undoStack = [...undoStack, cloneElements(elements)];
			redoStack = [];
			elements = nextElements;
		}
		textValue = '';
	}

	function cancelTextEditing(): void {
		textDraft = undefined;
		textValue = '';
	}

	function handleTextInputKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			commitText();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			cancelTextEditing();
		}
	}

	function handleKeyboardShortcut(event: KeyboardEvent): void {
		if ((!event.ctrlKey && !event.metaKey) || event.altKey) return;
		if (
			event.target instanceof HTMLInputElement &&
			event.target.dataset.drawingTextInput === 'true'
		)
			return;

		const key = event.key.toLowerCase();
		const isUndo = key === 'z' && !event.shiftKey;
		const isRedo = (key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey);
		if (!isUndo && !isRedo) return;

		event.preventDefault();
		event.stopPropagation();
		if (isUndo) undo();
		else redo();
	}

	function clearDrawing(): void {
		if (elements.length === 0) return;
		undoStack = [...undoStack, cloneElements(elements)];
		redoStack = [];
		elements = [];
		selection = undefined;
	}

	async function saveDrawing(): Promise<void> {
		await onSave({ ...startingDrawing, elements: cloneElements(elements) });
	}

	function toolLabel(value: DrawingTool): string {
		switch (value) {
			case 'select':
				return 'Select and move';
			case 'freehand':
				return 'Pen';
			case 'line':
				return 'Straight line';
			case 'rectangle':
				return 'Rectangle or square';
			case 'ellipse':
				return 'Ellipse or circle';
			case 'text':
				return 'Text';
			case 'eraser':
				return 'Eraser';
		}
	}
</script>

<svelte:window onkeydown={handleKeyboardShortcut} />

{#snippet drawElement(element: DrawableDrawingElement)}
	{#if element.type === 'freehand'}
		<path
			data-drawing-element-id={element.id}
			data-drawing-element-type={element.type}
			d={freehandSvgPath(element.points, element.strokeWidth)}
			fill={element.stroke}
		></path>
	{:else if element.type === 'line'}
		<line
			data-drawing-element-id={element.id}
			data-drawing-element-type={element.type}
			x1={element.x1}
			y1={element.y1}
			x2={element.x2}
			y2={element.y2}
			stroke={element.stroke}
			stroke-width={element.strokeWidth}
			stroke-linecap="round"
		></line>
	{:else if element.type === 'rectangle'}
		<rect
			data-drawing-element-id={element.id}
			data-drawing-element-type={element.type}
			x={element.x}
			y={element.y}
			width={element.width}
			height={element.height}
			fill="none"
			stroke={element.stroke}
			stroke-width={element.strokeWidth}
			stroke-linejoin="round"
		></rect>
	{:else if element.type === 'ellipse'}
		<ellipse
			data-drawing-element-id={element.id}
			data-drawing-element-type={element.type}
			cx={element.cx}
			cy={element.cy}
			rx={element.rx}
			ry={element.ry}
			fill="none"
			stroke={element.stroke}
			stroke-width={element.strokeWidth}
		></ellipse>
	{:else}
		<text
			data-drawing-element-id={element.id}
			data-drawing-element-type={element.type}
			x={element.x}
			y={element.y}
			fill={element.stroke}
			font-family="Arial, sans-serif"
			font-size={element.fontSize}>{element.text}</text
		>
	{/if}
{/snippet}

<Modal
	title="Edit drawing"
	description="Move intact objects or drag a rectangular selection to cut and move part of the artwork. Cut pieces continue to move as rectangular selections. In Select mode, hold Shift to start a selection over an object. Hold Shift to constrain shapes and lines."
	width="large"
	{onClose}
>
	<div class="drawing-editor">
		<div class="drawing-toolbar" aria-label="Drawing tools">
			<div class="tool-group" role="group" aria-label="Choose a drawing tool">
				<button
					type="button"
					class:active={tool === 'select'}
					aria-label="Select and move"
					aria-pressed={tool === 'select'}
					onclick={() => (tool = 'select')}><MousePointer2 size={18} /></button
				>
				<button
					type="button"
					class:active={tool === 'freehand'}
					aria-label="Pen"
					aria-pressed={tool === 'freehand'}
					onclick={() => (tool = 'freehand')}><PenLine size={18} /></button
				>
				<button
					type="button"
					class:active={tool === 'line'}
					aria-label="Straight line"
					aria-pressed={tool === 'line'}
					onclick={() => (tool = 'line')}><Minus size={19} /></button
				>
				<button
					type="button"
					class:active={tool === 'rectangle'}
					aria-label="Rectangle or square"
					aria-pressed={tool === 'rectangle'}
					onclick={() => (tool = 'rectangle')}><Square size={18} /></button
				>
				<button
					type="button"
					class:active={tool === 'ellipse'}
					aria-label="Ellipse or circle"
					aria-pressed={tool === 'ellipse'}
					onclick={() => (tool = 'ellipse')}><Circle size={18} /></button
				>
				<button
					type="button"
					class:active={tool === 'text'}
					aria-label="Text"
					aria-pressed={tool === 'text'}
					onclick={() => (tool = 'text')}><Type size={18} /></button
				>
				<button
					type="button"
					class:active={tool === 'eraser'}
					aria-label="Eraser"
					aria-pressed={tool === 'eraser'}
					onclick={() => (tool = 'eraser')}><Eraser size={18} /></button
				>
			</div>

			{#if tool !== 'select'}
				<div class="style-controls">
					<label class="color-control">
						<span>Color</span>
						<input type="color" bind:value={stroke} disabled={tool === 'eraser'} />
					</label>
					{#if tool === 'text'}
						<label class="width-control">
							<span>Size</span>
							<input type="range" min="16" max="96" step="1" bind:value={fontSize} />
							<output>{fontSize}</output>
						</label>
					{:else if tool === 'eraser'}
						<label class="width-control">
							<span>Size</span>
							<input type="range" min="12" max="160" step="2" bind:value={eraserWidth} />
							<output>{eraserWidth}</output>
						</label>
					{:else}
						<label class="width-control">
							<span>Width</span>
							<input type="range" min="3" max="48" step="1" bind:value={strokeWidth} />
							<output>{strokeWidth}</output>
						</label>
					{/if}
				</div>
			{/if}

			<div class="history-controls" role="group" aria-label="Drawing history">
				<button
					type="button"
					aria-label="Undo drawing action"
					disabled={undoStack.length === 0}
					onclick={undo}><Undo2 size={18} /></button
				>
				<button
					type="button"
					aria-label="Redo drawing action"
					disabled={redoStack.length === 0}
					onclick={redo}><Redo2 size={18} /></button
				>
				<button
					type="button"
					aria-label="Clear drawing"
					disabled={elements.length === 0}
					onclick={clearDrawing}><Trash2 size={18} /></button
				>
			</div>
		</div>

		<p class="active-tool">
			Using: <strong>{toolLabel(tool)}</strong>
			{#if tool === 'select'}· Click and drag an object, or hold Shift and drag anywhere to make a
				selection.{/if}
		</p>

		<div class="drawing-stage">
			<svg
				class:erasing={tool === 'eraser'}
				class:selecting={tool === 'select'}
				class:moving={selectionGesture?.mode === 'move-object' ||
					selectionGesture?.mode === 'move-region'}
				viewBox={`0 0 ${startingDrawing.width} ${startingDrawing.height}`}
				role="application"
				aria-label="Drawing canvas"
				onpointerdown={startDrawing}
				onpointermove={continueDrawing}
				onpointerup={finishDrawing}
				onpointercancel={cancelGesture}
			>
				<defs>
					{#each renderPlan.stages as stage (stage.outputId)}
						<g id={stage.inputId}>
							{#if stage.previousStateId}<use href={`#${stage.previousStateId}`}></use>{/if}
							{#each stage.drawables as element (element.id)}
								{@render drawElement(element)}
							{/each}
						</g>
						{#if stage.operation.type === 'eraser'}
							<mask
								id={`drawing-eraser-mask-${stage.index}`}
								maskUnits="userSpaceOnUse"
								x="0"
								y="0"
								width={startingDrawing.width}
								height={startingDrawing.height}
								style="mask-type: luminance"
							>
								<rect width="100%" height="100%" fill="white"></rect>
								<path
									d={freehandSvgPath(stage.operation.points, stage.operation.strokeWidth)}
									fill="black"
								></path>
							</mask>
							<g id={stage.outputId} mask={`url(#drawing-eraser-mask-${stage.index})`}>
								<use href={`#${stage.inputId}`}></use>
							</g>
						{:else}
							<mask
								id={`drawing-region-cut-${stage.index}`}
								maskUnits="userSpaceOnUse"
								x="0"
								y="0"
								width={startingDrawing.width}
								height={startingDrawing.height}
								style="mask-type: luminance"
							>
								<rect width="100%" height="100%" fill="white"></rect>
								<rect
									x={stage.operation.x}
									y={stage.operation.y}
									width={stage.operation.width}
									height={stage.operation.height}
									fill="black"
								></rect>
							</mask>
							<clipPath id={`drawing-region-clip-${stage.index}`} clipPathUnits="userSpaceOnUse">
								<rect
									x={stage.operation.x}
									y={stage.operation.y}
									width={stage.operation.width}
									height={stage.operation.height}
								></rect>
							</clipPath>
							<g id={stage.outputId}>
								<g mask={`url(#drawing-region-cut-${stage.index})`}>
									<use href={`#${stage.inputId}`}></use>
								</g>
								<g transform={`translate(${stage.operation.dx} ${stage.operation.dy})`}>
									<g clip-path={`url(#drawing-region-clip-${stage.index})`}>
										<use href={`#${stage.inputId}`}></use>
									</g>
								</g>
							</g>
						{/if}
					{/each}
				</defs>
				<rect width="100%" height="100%" fill={startingDrawing.background}></rect>
				{#if renderPlan.finalStateId}<use href={`#${renderPlan.finalStateId}`}></use>{/if}
				{#each renderPlan.finalDrawables as element (element.id)}
					{@render drawElement(element)}
				{/each}
				{#if tool === 'select' && selectionBounds}
					<rect
						class="selection-outline"
						class:region={selection?.kind === 'region'}
						x={selectionBounds.x}
						y={selectionBounds.y}
						width={selectionBounds.width}
						height={selectionBounds.height}
					></rect>
				{/if}
				{#if textDraft}
					<foreignObject
						x={textDraft.x}
						y={textDraft.y - textDraft.fontSize * 1.2}
						width={Math.max(100, startingDrawing.width - textDraft.x)}
						height={textDraft.fontSize * 1.7}
					>
						<input
							class="canvas-text-input"
							aria-label="Drawing text"
							data-drawing-text-input="true"
							{@attach focusTextInput(textDraft.selectOnFocus)}
							bind:value={textValue}
							style:color={textDraft.stroke}
							style:font-size={`${textDraft.fontSize}px`}
							onpointerdown={(event) => event.stopPropagation()}
							onpointerup={(event) => event.stopPropagation()}
							onkeydown={handleTextInputKeydown}
							onblur={commitText}
						/>
					</foreignObject>
				{/if}
			</svg>
		</div>

		<div class="actions">
			<button class="button button-secondary" type="button" disabled={saving} onclick={onClose}
				>Cancel</button
			>
			<button class="button button-primary" type="button" disabled={saving} onclick={saveDrawing}
				><Save size={16} />{saving ? 'Saving…' : 'Done'}</button
			>
		</div>
	</div>
</Modal>

<style>
	.drawing-editor {
		display: grid;
		gap: 0.8rem;
	}

	.drawing-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.55rem;
		background: #f5f1e9;
		border: 1px solid var(--line);
		border-radius: 0.65rem;
	}

	.tool-group,
	.history-controls,
	.style-controls,
	.width-control,
	.color-control {
		display: flex;
		align-items: center;
	}

	.tool-group,
	.history-controls {
		gap: 0.2rem;
	}

	.drawing-toolbar button {
		display: grid;
		width: 2.25rem;
		height: 2.25rem;
		place-items: center;
		padding: 0;
		color: var(--ink-soft);
		background: transparent;
		border: 0;
		border-radius: 0.42rem;
	}

	.drawing-toolbar button:hover,
	.drawing-toolbar button.active {
		color: var(--forest-deep);
		background: rgb(39 72 59 / 12%);
	}

	.drawing-toolbar button:disabled {
		opacity: 0.38;
	}

	.style-controls {
		gap: 0.8rem;
	}

	.color-control,
	.width-control {
		gap: 0.4rem;
		color: var(--ink-soft);
		font-size: 0.7rem;
		font-weight: 750;
	}

	.color-control input {
		width: 2rem;
		height: 1.8rem;
		padding: 0.1rem;
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.35rem;
	}

	.width-control input {
		width: 7rem;
		accent-color: var(--forest);
	}

	.width-control output {
		min-width: 1.5rem;
		text-align: right;
	}

	.active-tool {
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.72rem;
	}

	.drawing-stage {
		display: grid;
		width: min(100%, 40rem);
		aspect-ratio: 1;
		justify-self: center;
		background: #fffefa;
		border: 1px solid #cfc8bc;
		box-shadow: 0 8px 26px rgb(38 43 39 / 12%);
	}

	svg {
		width: 100%;
		height: 100%;
		touch-action: none;
		cursor: crosshair;
		user-select: none;
	}

	svg.erasing {
		cursor: cell;
	}

	svg.selecting {
		cursor: default;
	}

	svg.moving {
		cursor: grabbing;
	}

	.selection-outline {
		fill: transparent;
		stroke: #1677d2;
		stroke-width: 2;
		stroke-dasharray: 8 6;
		vector-effect: non-scaling-stroke;
		pointer-events: none;
	}

	.selection-outline.region {
		fill: rgb(22 119 210 / 8%);
	}

	.canvas-text-input {
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		padding: 0 0.18em;
		font-family: Arial, sans-serif;
		line-height: 1.2;
		background: rgb(255 254 250 / 94%);
		border: 2px dashed var(--forest);
		border-radius: 0.15em;
		outline: none;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.65rem;
		padding-top: 0.7rem;
		border-top: 1px solid var(--line);
	}

	.actions button {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	@media (max-width: 720px) {
		.drawing-toolbar {
			flex-wrap: wrap;
		}

		.style-controls {
			order: 3;
			width: 100%;
			justify-content: space-between;
		}
	}
</style>
