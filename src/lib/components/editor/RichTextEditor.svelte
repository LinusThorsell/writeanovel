<script lang="ts">
	import {
		AlignCenter,
		AlignLeft,
		AlignRight,
		Bold,
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
	import {
		BOOK_LAYOUT,
		bookTypographyStyle,
		type TypesetDocumentHeading
	} from '$lib/typesetting/book-style';

	type Props = {
		body: RichTextNode;
		assetUrls: ReadonlyMap<string, string>;
		typography: TypographyPreset;
		trimSize: TrimSize;
		typesetHeading?: TypesetDocumentHeading;
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
		typesetHeading,
		placeholder = 'Begin writing…',
		onChange,
		onAddMedia,
		onError
	}: Props = $props();

	let editor = $state.raw<Editor>();
	let revision = $state(0);
	let pageHeight = $state(1_104);
	let pageMarginInline = $state(88);
	let pageMarginBlock = $state(88);
	let documentHeadingHeight = $state(0);
	let mediaInput = $state<HTMLInputElement>();
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	const typographyStyle = $derived(bookTypographyStyle(typography));
	const documentHeadingTop = $derived(pageHeight * BOOK_LAYOUT.documentHeadingTopRatio);
	const documentHeadingGap = $derived(
		typographyStyle.editorBodyFontSizeRem * 16 * BOOK_LAYOUT.documentHeadingGapEm
	);
	const documentHeadingSpace = $derived(
		typesetHeading?.label || typesetHeading?.title
			? Math.max(
					0,
					documentHeadingTop + documentHeadingHeight + documentHeadingGap - pageMarginBlock
				)
			: 0
	);

	function updatePaperLayout(element: HTMLElement): void {
		if (element.clientWidth <= 0) return;
		const layout = calculateEditorPageLayout(trimSize, element.clientWidth);
		pageHeight = layout.pageHeight;
		pageMarginInline = layout.pageMarginInline;
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

	const observeDocumentHeading: Attachment<HTMLElement> = (element) => {
		const updateHeight = () => {
			documentHeadingHeight = element.getBoundingClientRect().height;
		};
		updateHeight();
		const resizeObserver = new ResizeObserver(updateHeight);
		resizeObserver.observe(element);

		return () => {
			resizeObserver.disconnect();
		};
	};

	const mountEditor: Attachment<HTMLElement> = (element) => {
		const initialBody = untrack(() => hydrateAssetSources(body, assetUrls));
		const instance = new Editor({
			element,
			extensions: editorExtensions(placeholder),
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

<div class="editor-shell">
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
		style:--page-margin-inline={`${pageMarginInline}px`}
		style:--page-margin-block={`${pageMarginBlock}px`}
		style:--body-font-family={typographyStyle.editorFontFamily}
		style:--body-font-size={`${typographyStyle.editorBodyFontSizeRem}rem`}
		style:--body-line-height={String(typographyStyle.lineHeight)}
		style:--document-heading-top={`${documentHeadingTop}px`}
		style:--document-heading-space={`${documentHeadingSpace}px`}
		style:--document-title-scale={String(typographyStyle.documentTitleScale)}
		style:--document-label-scale={String(typographyStyle.documentLabelScale)}
		style:--document-title-letter-spacing={`${BOOK_LAYOUT.documentTitleLetterSpacingEm}em`}
		style:--document-label-letter-spacing={`${BOOK_LAYOUT.documentLabelLetterSpacingEm}em`}
		style:--document-label-gap={`${BOOK_LAYOUT.documentLabelGapEm}em`}
		style:--heading-one-scale={String(typographyStyle.headingOneScale)}
		style:--heading-two-scale={String(typographyStyle.headingTwoScale)}
		style:--heading-three-scale={String(typographyStyle.headingThreeScale)}
		style:--heading-line-height={String(BOOK_LAYOUT.headingLineHeight)}
		style:--paragraph-gap={`${BOOK_LAYOUT.paragraphGapEm}em`}
		style:--paragraph-indent={`${BOOK_LAYOUT.paragraphIndentEm}em`}
		style:--heading-margin-top={`${BOOK_LAYOUT.headingMarginTopEm}em`}
		style:--heading-margin-bottom={`${BOOK_LAYOUT.headingMarginBottomEm}em`}
		style:--blockquote-margin-block={`${BOOK_LAYOUT.blockquoteMarginBlockEm}em`}
		style:--blockquote-margin-inline={`${BOOK_LAYOUT.blockquoteMarginInlineEm}em`}
		style:--media-margin-block={`${BOOK_LAYOUT.mediaMarginBlockEm}em`}
	>
		{#if typesetHeading?.label || typesetHeading?.title}
			<div
				class="typeset-document-heading"
				class:chapter-heading={typesetHeading.kind === 'chapter'}
				aria-label="Typeset page heading"
				{@attach observeDocumentHeading}
			>
				{#if typesetHeading.label}
					<p>{typesetHeading.label}</p>
				{/if}
				{#if typesetHeading.title}<h1>{typesetHeading.title}</h1>{/if}
			</div>
		{/if}
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
		min-height: var(--page-height);
		margin: 2rem auto 6rem;
		background: #fffefb;
		box-shadow: 0 8px 30px rgb(47 48 43 / 13%);
		isolation: isolate;
	}

	.typeset-document-heading {
		position: absolute;
		z-index: 2;
		top: var(--document-heading-top);
		right: var(--page-margin-inline);
		left: var(--page-margin-inline);
		color: #171a18;
		font-family: var(--body-font-family);
		text-align: center;
		text-wrap: balance;
		pointer-events: none;
	}

	.typeset-document-heading p {
		margin: 0 0 var(--document-label-gap);
		font-size: calc(var(--body-font-size) * var(--document-label-scale));
		font-weight: 650;
		letter-spacing: var(--document-label-letter-spacing);
		line-height: var(--heading-line-height);
		text-transform: uppercase;
	}

	.typeset-document-heading h1 {
		margin: 0;
		font-size: calc(var(--body-font-size) * var(--document-title-scale));
		font-weight: 400;
		letter-spacing: var(--document-title-letter-spacing);
		line-height: var(--heading-line-height);
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
		min-height: var(--page-height);
		padding-block-start: calc(var(--page-margin-block) + var(--document-heading-space));
		padding-block-end: var(--page-margin-block);
		padding-inline: var(--page-margin-inline);
		color: #171a18;
		background: transparent;
		font-family: var(--body-font-family);
		font-size: var(--body-font-size);
		line-height: var(--body-line-height);
		hyphens: auto;
		overflow-wrap: anywhere;
		word-break: normal;
		text-wrap: pretty;
		outline: none;
	}

	.editor-mount :global(.writing-surface p) {
		margin: 0 0 var(--paragraph-gap);
	}

	.editor-mount :global(.writing-surface p + p) {
		text-indent: var(--paragraph-indent);
	}

	.editor-mount :global(.writing-surface h1),
	.editor-mount :global(.writing-surface h2),
	.editor-mount :global(.writing-surface h3) {
		margin: var(--heading-margin-top) 0 var(--heading-margin-bottom);
		line-height: var(--heading-line-height);
		text-wrap: balance;
	}

	.editor-mount :global(.writing-surface h1) {
		font-size: calc(var(--body-font-size) * var(--heading-one-scale));
		text-align: center;
	}

	.editor-mount :global(.writing-surface h2) {
		font-size: calc(var(--body-font-size) * var(--heading-two-scale));
	}

	.editor-mount :global(.writing-surface h3) {
		font-size: calc(var(--body-font-size) * var(--heading-three-scale));
	}

	.editor-mount :global(.writing-surface blockquote) {
		margin: var(--blockquote-margin-block) var(--blockquote-margin-inline);
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
		margin: var(--media-margin-block) 0;
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

		.paper {
			box-shadow: none;
		}
	}
</style>
