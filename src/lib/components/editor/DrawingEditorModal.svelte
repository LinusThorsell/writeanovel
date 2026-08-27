<script lang="ts">
	import {
		Circle,
		Eraser,
		Minus,
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
		drawingElementContainsPoint,
		freehandSvgPath,
		shapeFromDrag,
		type ShapeTool
	} from '$lib/domain/drawing';
	import type {
		DrawingDocument,
		DrawingElement,
		DrawingPoint,
		EraserDrawingElement,
		FreehandDrawingElement,
		TextDrawingElement
	} from '$lib/domain/types';

	type DrawingTool = 'freehand' | ShapeTool | 'text' | 'eraser';

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
	let activePointerId: number | undefined;
	let gestureStart: { x: number; y: number } | undefined;
	let gestureElements: DrawingElement[] | undefined;
	let gestureElementId: string | undefined;
	const visibleElements = $derived(preview ? [...elements, preview] : elements);

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

	function erasersAfter(index: number): EraserDrawingElement[] {
		return visibleElements
			.slice(index + 1)
			.filter((element): element is EraserDrawingElement => element.type === 'eraser');
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
		activePointerId = undefined;
		gestureStart = undefined;
		gestureElements = undefined;
		gestureElementId = undefined;
	}

	function cancelGesture(event: PointerEvent): void {
		if (event.pointerId !== activePointerId) return;
		if (gestureElements) elements = gestureElements;
		preview = undefined;
		activePointerId = undefined;
		gestureStart = undefined;
		gestureElements = undefined;
		gestureElementId = undefined;
	}

	function undo(): void {
		const previous = undoStack.at(-1);
		if (!previous) return;
		redoStack = [...redoStack, cloneElements(elements)];
		elements = cloneElements(previous);
		undoStack = undoStack.slice(0, -1);
	}

	function redo(): void {
		const next = redoStack.at(-1);
		if (!next) return;
		undoStack = [...undoStack, cloneElements(elements)];
		elements = cloneElements(next);
		redoStack = redoStack.slice(0, -1);
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
	}

	async function saveDrawing(): Promise<void> {
		await onSave({ ...startingDrawing, elements: cloneElements(elements) });
	}

	function toolLabel(value: DrawingTool): string {
		switch (value) {
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

<Modal
	title="Edit drawing"
	description="Draw freely, add shapes or text, and brush away only the parts you erase. Hold Shift to constrain shapes and lines."
	width="large"
	{onClose}
>
	<div class="drawing-editor">
		<div class="drawing-toolbar" aria-label="Drawing tools">
			<div class="tool-group" role="group" aria-label="Choose a drawing tool">
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

		<p class="active-tool">Using: <strong>{toolLabel(tool)}</strong></p>

		<div class="drawing-stage">
			<svg
				class:erasing={tool === 'eraser'}
				viewBox={`0 0 ${startingDrawing.width} ${startingDrawing.height}`}
				role="application"
				aria-label="Drawing canvas"
				onpointerdown={startDrawing}
				onpointermove={continueDrawing}
				onpointerup={finishDrawing}
				onpointercancel={cancelGesture}
			>
				<defs>
					{#each visibleElements as element, index (element.id)}
						{@const erasers = erasersAfter(index)}
						{#if element.type !== 'eraser' && erasers.length > 0}
							<mask
								id={`drawing-eraser-mask-${index}`}
								maskUnits="userSpaceOnUse"
								x="0"
								y="0"
								width={startingDrawing.width}
								height={startingDrawing.height}
								style="mask-type: luminance"
							>
								<rect width="100%" height="100%" fill="white"></rect>
								{#each erasers as eraser (eraser.id)}
									<path d={freehandSvgPath(eraser.points, eraser.strokeWidth)} fill="black"></path>
								{/each}
							</mask>
						{/if}
					{/each}
				</defs>
				<rect width="100%" height="100%" fill={startingDrawing.background}></rect>
				{#each visibleElements as element, index (element.id)}
					{@const erasers = erasersAfter(index)}
					{#if element.type !== 'eraser'}
						<g mask={erasers.length > 0 ? `url(#drawing-eraser-mask-${index})` : undefined}>
							{#if element.type === 'freehand'}
								<path d={freehandSvgPath(element.points, element.strokeWidth)} fill={element.stroke}
								></path>
							{:else if element.type === 'line'}
								<line
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
									x={element.x}
									y={element.y}
									fill={element.stroke}
									font-family="Arial, sans-serif"
									font-size={element.fontSize}>{element.text}</text
								>
							{/if}
						</g>
					{/if}
				{/each}
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
