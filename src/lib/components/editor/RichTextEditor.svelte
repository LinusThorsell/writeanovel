<script lang="ts">
	import {
		AlignCenter,
		AlignLeft,
		AlignRight,
		Bold,
		Files,
		ImagePlus,
		Italic,
		Link,
		List,
		ListOrdered,
		Quote,
		Redo2,
		Strikethrough,
		Underline,
		Undo2
	} from '@lucide/svelte';
	import { Editor } from '@tiptap/core';
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { MediaInsertion } from '$lib/application/writeanovel-state.svelte';
	import {
		MEDIA_ACCEPT_ATTRIBUTE,
		hydrateAssetSources,
		removeTransientAssetSources
	} from '$lib/application/media-service';
	import type { RichTextNode, TrimSize, TypographyPreset } from '$lib/domain/types';
	import { editorExtensions } from '$lib/editor/extensions';
	import { calculateEditorPageLayout } from '$lib/editor/page-layout';

	type Props = {
		body: RichTextNode;
		assetUrls: ReadonlyMap<string, string>;
		typography: TypographyPreset;
		trimSize: TrimSize;
		placeholder?: string;
		onChange: (body: RichTextNode) => void;
		onAddMedia: (file: File) => Promise<MediaInsertion>;
		onError: (message: string) => void;
	};

	let {
		body,
		assetUrls,
		typography,
		trimSize,
		placeholder = 'Begin writing…',
		onChange,
		onAddMedia,
		onError
	}: Props = $props();

	let editor = $state.raw<Editor>();
	let revision = $state(0);
	let pageCount = $state(1);
	let pageHeight = $state(1_104);
	let pageGap = $state(32);
	let pageMarginBlock = $state(88);
	let mediaInput = $state<HTMLInputElement>();
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	const pageNumbers = $derived(Array.from({ length: pageCount }, (_, index) => index + 1));
	const canvasHeight = $derived(pageCount * pageHeight + (pageCount - 1) * pageGap);

	function updatePaperLayout(element: HTMLElement): void {
		if (element.clientWidth <= 0) return;
		const layout = calculateEditorPageLayout(trimSize, element.clientWidth);
		pageHeight = layout.pageHeight;
		pageGap = layout.pageGap;
		pageMarginBlock = layout.pageMarginBlock;
	}

	const observePaper: Attachment<HTMLElement> = (element) => {
		updatePaperLayout(element);
		const resizeObserver = new ResizeObserver(() => updatePaperLayout(element));
		resizeObserver.observe(element);

		return () => {
			resizeObserver.disconnect();
		};
	};

	const captureMediaInput: Attachment<HTMLInputElement> = (element) => {
		mediaInput = element;
		return () => {
			mediaInput = undefined;
		};
	};

	const mountEditor: Attachment<HTMLElement> = (element) => {
		const initialBody = untrack(() => hydrateAssetSources(body, assetUrls));
		const instance = new Editor({
			element,
			extensions: editorExtensions(placeholder, {
				onPageCount: (nextPageCount) => {
					pageCount = nextPageCount;
				}
			}),
			content: initialBody,
			editorProps: {
				attributes: {
					class: 'writing-surface',
					spellcheck: 'true',
					'aria-label': 'Manuscript editor'
				}
			},
			onTransaction: () => {
				revision += 1;
			},
			onUpdate: ({ editor: updatedEditor }) => {
				if (saveTimer) clearTimeout(saveTimer);
				saveTimer = setTimeout(() => {
					onChange(removeTransientAssetSources(updatedEditor.getJSON()));
				}, 350);
			}
		});
		editor = instance;

		return () => {
			if (saveTimer) clearTimeout(saveTimer);
			instance.destroy();
			editor = undefined;
		};
	};

	function isActive(name: string): boolean {
		revision;
		return editor?.isActive(name) ?? false;
	}

	function isHeading(level: 1 | 2 | 3): boolean {
		revision;
		return editor?.isActive('heading', { level }) ?? false;
	}

	function applyBlock(event: Event): void {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (!editor) return;
		if (value === 'paragraph') editor.chain().focus().setParagraph().run();
		if (value === 'heading-1') editor.chain().focus().toggleHeading({ level: 1 }).run();
		if (value === 'heading-2') editor.chain().focus().toggleHeading({ level: 2 }).run();
		if (value === 'heading-3') editor.chain().focus().toggleHeading({ level: 3 }).run();
	}

	function currentBlock(): string {
		revision;
		if (isHeading(1)) return 'heading-1';
		if (isHeading(2)) return 'heading-2';
		if (isHeading(3)) return 'heading-3';
		return 'paragraph';
	}

	function editLink(): void {
		if (!editor) return;
		const currentHref = String(editor.getAttributes('link').href ?? '');
		const href = window.prompt('Paste a web address', currentHref);
		if (href === null) return;
		if (!href.trim()) {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run();
	}

	async function insertMedia(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || !editor) return;

		try {
			const inserted = await onAddMedia(file);
			editor
				.chain()
				.focus()
				.insertContent({
					type: 'image',
					attrs: {
						src: inserted.url,
						assetId: inserted.assetId,
						alt: inserted.name,
						alignment: 'center'
					}
				})
				.run();
		} catch (error) {
			onError(error instanceof Error ? error.message : 'The image could not be added.');
		}
	}

	function alignImage(alignment: 'left' | 'center' | 'right'): void {
		editor?.chain().focus().updateAttributes('image', { alignment }).run();
	}
</script>

<div
	class="editor-shell"
	class:literary={typography === 'literary'}
	class:classic={typography === 'classic'}
	class:modern={typography === 'modern'}
>
	<div class="toolbar" aria-label="Text formatting">
		<select
			class="block-select"
			aria-label="Text style"
			value={currentBlock()}
			onchange={applyBlock}
		>
			<option value="paragraph">Body text</option>
			<option value="heading-1">Heading 1</option>
			<option value="heading-2">Heading 2</option>
			<option value="heading-3">Heading 3</option>
		</select>
		<span class="divider"></span>
		<button
			type="button"
			class:active={isActive('bold')}
			aria-label="Bold"
			aria-pressed={isActive('bold')}
			onclick={() => editor?.chain().focus().toggleBold().run()}><Bold size={18} /></button
		>
		<button
			type="button"
			class:active={isActive('italic')}
			aria-label="Italic"
			aria-pressed={isActive('italic')}
			onclick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={18} /></button
		>
		<button
			type="button"
			class:active={isActive('underline')}
			aria-label="Underline"
			aria-pressed={isActive('underline')}
			onclick={() => editor?.chain().focus().toggleUnderline().run()}
			><Underline size={18} /></button
		>
		<button
			type="button"
			class:active={isActive('strike')}
			aria-label="Strikethrough"
			aria-pressed={isActive('strike')}
			onclick={() => editor?.chain().focus().toggleStrike().run()}
			><Strikethrough size={18} /></button
		>
		<button
			type="button"
			class:active={isActive('link')}
			aria-label="Add or edit link"
			aria-pressed={isActive('link')}
			onclick={editLink}><Link size={18} /></button
		>
		<span class="divider"></span>
		<button
			type="button"
			class:active={isActive('bulletList')}
			aria-label="Bullet list"
			aria-pressed={isActive('bulletList')}
			onclick={() => editor?.chain().focus().toggleBulletList().run()}><List size={18} /></button
		>
		<button
			type="button"
			class:active={isActive('orderedList')}
			aria-label="Numbered list"
			aria-pressed={isActive('orderedList')}
			onclick={() => editor?.chain().focus().toggleOrderedList().run()}
			><ListOrdered size={18} /></button
		>
		<button
			type="button"
			class:active={isActive('blockquote')}
			aria-label="Block quote"
			aria-pressed={isActive('blockquote')}
			onclick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={18} /></button
		>
		<span class="divider"></span>
		<button type="button" aria-label="Insert image or SVG" onclick={() => mediaInput?.click()}
			><ImagePlus size={18} /></button
		>
		<input
			class="screen-reader-only"
			{@attach captureMediaInput}
			type="file"
			accept={MEDIA_ACCEPT_ATTRIBUTE}
			onchange={insertMedia}
		/>
		<span class="toolbar-spacer"></span>
		<span class="pagination-status" aria-label="Manuscript pagination">
			<Files size={16} />
			{pageCount}
			{pageCount === 1 ? 'page' : 'pages'}
		</span>
		<button type="button" aria-label="Undo" onclick={() => editor?.chain().focus().undo().run()}
			><Undo2 size={18} /></button
		>
		<button type="button" aria-label="Redo" onclick={() => editor?.chain().focus().redo().run()}
			><Redo2 size={18} /></button
		>
	</div>

	{#if isActive('image')}
		<div class="image-toolbar" aria-label="Image position">
			<span>Image position</span>
			<button type="button" aria-label="Align image left" onclick={() => alignImage('left')}
				><AlignLeft size={17} /></button
			>
			<button type="button" aria-label="Center image" onclick={() => alignImage('center')}
				><AlignCenter size={17} /></button
			>
			<button type="button" aria-label="Align image right" onclick={() => alignImage('right')}
				><AlignRight size={17} /></button
			>
			<small>Drag a corner to resize</small>
		</div>
	{/if}

	<div
		class="paper"
		{@attach observePaper}
		style:--page-height={`${pageHeight}px`}
		style:--page-gap={`${pageGap}px`}
		style:--page-margin-block={`${pageMarginBlock}px`}
		style:--canvas-height={`${canvasHeight}px`}
	>
		<div class="page-stack" aria-hidden="true">
			{#each pageNumbers as pageNumber (pageNumber)}
				<div class="page-sheet"><span>Page {pageNumber}</span></div>
			{/each}
		</div>
		<div class="editor-mount" {@attach mountEditor}></div>
	</div>
</div>

<style>
	.editor-shell {
		width: 100%;
		min-width: 0;
		min-height: 100%;
		overflow-x: clip;
		background: #e9e4db;
	}

	.toolbar {
		position: sticky;
		z-index: 5;
		top: 0;
		display: flex;
		align-items: center;
		gap: 0.2rem;
		min-height: 3rem;
		padding: 0.35rem 0.75rem;
		overflow-x: auto;
		background: rgb(251 248 242 / 96%);
		border-bottom: 1px solid var(--line);
		backdrop-filter: blur(10px);
	}

	.toolbar button,
	.image-toolbar button {
		display: grid;
		flex: 0 0 auto;
		width: 2.15rem;
		height: 2.15rem;
		place-items: center;
		padding: 0;
		color: var(--ink-soft);
		background: transparent;
		border: 0;
		border-radius: 0.42rem;
	}

	.toolbar button:hover,
	.toolbar button.active,
	.image-toolbar button:hover {
		color: var(--forest-deep);
		background: rgb(39 72 59 / 11%);
	}

	.block-select {
		flex: 0 0 auto;
		padding: 0.42rem 1.7rem 0.42rem 0.55rem;
		color: var(--ink);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.45rem;
		font-size: 0.82rem;
	}

	.divider {
		width: 1px;
		height: 1.5rem;
		margin: 0 0.25rem;
		background: var(--line);
	}

	.toolbar-spacer {
		flex: 1 0 1rem;
	}

	.pagination-status {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 0.35rem;
		padding: 0 0.45rem;
		color: var(--ink-soft);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.image-toolbar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.35rem;
		color: var(--ink-soft);
		background: #f5f1e9;
		border-bottom: 1px solid var(--line);
		font-size: 0.75rem;
	}

	.image-toolbar span {
		margin-right: 0.35rem;
		font-weight: 750;
	}

	.image-toolbar small {
		margin-left: 0.5rem;
	}

	.paper {
		position: relative;
		width: min(46rem, calc(100% - 2rem));
		min-width: 0;
		min-height: var(--canvas-height);
		margin: 2rem auto 6rem;
		isolation: isolate;
	}

	.page-stack {
		position: absolute;
		z-index: 0;
		inset: 0 0 auto;
		display: grid;
		gap: var(--page-gap);
		pointer-events: none;
	}

	.page-sheet {
		position: relative;
		height: var(--page-height);
		background: #fffefb;
		box-shadow: 0 8px 30px rgb(47 48 43 / 13%);
	}

	.page-sheet span {
		position: absolute;
		right: clamp(1.4rem, 12%, 5.5rem);
		bottom: 1.35rem;
		color: #96958f;
		font-family: 'Manrope Variable', sans-serif;
		font-size: 0.65rem;
		font-variant-numeric: tabular-nums;
	}

	.editor-mount {
		position: relative;
		z-index: 1;
		min-width: 0;
	}

	.editor-mount :global(.writing-surface) {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		min-height: var(--canvas-height);
		padding: var(--page-margin-block) clamp(1.4rem, 12%, 5.5rem);
		color: #171a18;
		background: transparent;
		font-size: 1rem;
		line-height: 1.72;
		hyphens: auto;
		overflow-wrap: anywhere;
		word-break: normal;
		text-wrap: pretty;
		outline: none;
	}

	.literary .editor-mount :global(.writing-surface) {
		font-family: 'Libre Baskerville', Georgia, serif;
	}

	.classic .editor-mount :global(.writing-surface) {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.04rem;
	}

	.modern .editor-mount :global(.writing-surface) {
		font-family: 'Manrope Variable', sans-serif;
		font-size: 0.98rem;
		line-height: 1.68;
	}

	.editor-mount :global(.page-break-decoration) {
		display: block;
		width: 100%;
		height: calc(var(--page-margin-block) * 2 + var(--page-gap));
		margin: 0;
		pointer-events: none;
		user-select: none;
	}

	.editor-mount :global(.pagination-measuring .page-break-decoration) {
		display: none;
	}

	.editor-mount :global(.writing-surface p) {
		margin: 0 0 0.2rem;
	}

	.editor-mount :global(.writing-surface p + p) {
		text-indent: 1.5em;
	}

	.editor-mount :global(.writing-surface h1),
	.editor-mount :global(.writing-surface h2),
	.editor-mount :global(.writing-surface h3) {
		margin: 2.2em 0 0.8em;
		line-height: 1.25;
		text-wrap: balance;
	}

	.editor-mount :global(.writing-surface h1) {
		font-size: 1.75rem;
		text-align: center;
	}

	.editor-mount :global(.writing-surface h2) {
		font-size: 1.35rem;
	}

	.editor-mount :global(.writing-surface h3) {
		font-size: 1.08rem;
	}

	.editor-mount :global(.writing-surface blockquote) {
		margin: 1.5rem 2rem;
		color: #48524d;
		font-style: italic;
	}

	.editor-mount :global(.writing-surface img) {
		display: block;
		max-width: 100%;
		max-height: calc(var(--page-height) - var(--page-margin-block) * 2);
		height: auto;
		margin: 0;
		border-radius: 0.15rem;
	}

	.editor-mount :global([data-resize-container]) {
		max-width: 100%;
		justify-content: center;
		margin: 1.5rem 0;
	}

	.editor-mount :global([data-resize-container]:has(img[data-alignment='left'])) {
		justify-content: flex-start;
	}

	.editor-mount :global([data-resize-container]:has(img[data-alignment='right'])) {
		justify-content: flex-end;
	}

	.editor-mount :global([data-resize-wrapper]) {
		max-width: 100%;
	}

	.editor-mount :global([data-resize-handle]) {
		z-index: 2;
		width: 0.8rem;
		height: 0.8rem;
		background: white;
		border: 2px solid var(--forest);
		border-radius: 50%;
		box-shadow: 0 1px 4px rgb(22 35 29 / 25%);
	}

	.editor-mount :global([data-resize-handle='top-left']),
	.editor-mount :global([data-resize-handle='bottom-right']) {
		cursor: nwse-resize;
	}

	.editor-mount :global([data-resize-handle='top-right']),
	.editor-mount :global([data-resize-handle='bottom-left']) {
		cursor: nesw-resize;
	}

	.editor-mount :global([data-resize-handle='top-left']) {
		transform: translate(-50%, -50%);
	}

	.editor-mount :global([data-resize-handle='top-right']) {
		transform: translate(50%, -50%);
	}

	.editor-mount :global([data-resize-handle='bottom-left']) {
		transform: translate(-50%, 50%);
	}

	.editor-mount :global([data-resize-handle='bottom-right']) {
		transform: translate(50%, 50%);
	}

	.editor-mount :global(.writing-surface p.is-editor-empty:first-child::before) {
		float: left;
		height: 0;
		color: #a5aaa6;
		pointer-events: none;
		content: attr(data-placeholder);
	}

	@media (max-width: 760px) {
		.paper {
			width: 100%;
			margin: 0;
		}

		.page-sheet {
			box-shadow: none;
		}

		.editor-mount :global(.writing-surface) {
			padding-inline: 1.4rem;
		}
	}
</style>
