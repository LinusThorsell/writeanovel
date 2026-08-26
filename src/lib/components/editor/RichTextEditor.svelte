<script lang="ts">
	import {
		AlignCenter,
		AlignLeft,
		AlignRight,
		BookOpen,
		Bold,
		CornerDownRight,
		ImagePlus,
		Italic,
		Link,
		List,
		ListOrdered,
		LoaderCircle,
		Maximize2,
		MessageSquarePlus,
		MessagesSquare,
		Minimize2,
		Quote,
		Redo2,
		Send,
		Strikethrough,
		Trash2,
		Underline,
		Undo2,
		X
	} from '@lucide/svelte';
	import { Editor } from '@tiptap/core';
	import { untrack, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { MediaInsertion } from '$lib/application/writeanovel-state.svelte';
	import {
		MEDIA_ACCEPT_ATTRIBUTE,
		hydrateAssetSources,
		removeTransientAssetSources
	} from '$lib/application/media-service';
	import type { CommentThread, RichTextNode, TrimSize, TypographyPreset } from '$lib/domain/types';
	import {
		commentAnchorSnapshots,
		formatCommentQuote,
		REMOVE_COMMENT_ANCHOR_META,
		type CommentAnchorSnapshot
	} from '$lib/editor/comment-anchor';
	import { editorExtensions } from '$lib/editor/extensions';
	import { calculateEditorPageLayout } from '$lib/editor/page-layout';
	import {
		BOOK_LAYOUT,
		bookTypographyStyle,
		type TypesetDocumentHeading
	} from '$lib/typesetting/book-style';

	type Props = {
		body: RichTextNode;
		comments: CommentThread[];
		commentAuthor: string;
		assetUrls: ReadonlyMap<string, string>;
		typography: TypographyPreset;
		trimSize: TrimSize;
		distractionFree: boolean;
		pdfPreviewLoading: boolean;
		focusNavigation: Snippet;
		itemTitle: string;
		typesetHeading?: TypesetDocumentHeading;
		placeholder?: string;
		onChange: (body: RichTextNode) => void | Promise<void>;
		onCommentsChange: (body: RichTextNode, comments: CommentThread[]) => void | Promise<void>;
		onToggleDistractionFree: () => void | Promise<void>;
		onPreviewPdf: (anchorText: string) => Promise<void>;
		onTitleCommit: (title: string) => void;
		onAddMedia: (file: File) => Promise<MediaInsertion>;
		onError: (message: string) => void;
	};

	let {
		body,
		comments,
		commentAuthor,
		assetUrls,
		typography,
		trimSize,
		distractionFree,
		pdfPreviewLoading,
		focusNavigation,
		itemTitle,
		typesetHeading,
		placeholder = 'Begin writing…',
		onChange,
		onCommentsChange,
		onToggleDistractionFree,
		onPreviewPdf,
		onTitleCommit,
		onAddMedia,
		onError
	}: Props = $props();

	let editor = $state.raw<Editor>();
	let revision = $state(0);
	let pageHeight = $state(1_104);
	let pageMarginInline = $state(88);
	let pageMarginBlock = $state(88);
	let compactPage = $state(false);
	let documentHeadingHeight = $state(0);
	let mediaInput = $state<HTMLInputElement>();
	let paperElement: HTMLElement | undefined;
	let selectionCommentPosition = $state.raw<{ top: number; left: number }>();
	let commentPanelOpen = $state(false);
	let activeThreadId = $state<string>();
	let pendingComment = $state.raw<{ from: number; to: number; quotedText: string }>();
	let newCommentText = $state('');
	let replyText = $state('');
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let skipNextSave = false;
	const typographyStyle = $derived(bookTypographyStyle(typography));
	const documentHeadingTop = $derived(
		compactPage ? pageMarginBlock + 8 : pageHeight * BOOK_LAYOUT.documentHeadingTopRatio
	);
	const documentHeadingGap = $derived(
		typographyStyle.editorBodyFontSizeRem *
			16 *
			(compactPage ? BOOK_LAYOUT.compactDocumentHeadingGapEm : BOOK_LAYOUT.documentHeadingGapEm)
	);
	const documentHeadingSpace = $derived(
		typesetHeading?.label || typesetHeading?.title
			? Math.max(
					0,
					documentHeadingTop + documentHeadingHeight + documentHeadingGap - pageMarginBlock
				)
			: 0
	);
	const liveCommentAnchors = $derived.by(() => {
		revision;
		return editor
			? commentAnchorSnapshots(editor.state.doc)
			: new Map<string, CommentAnchorSnapshot>();
	});

	async function persistEditorSnapshot(currentEditor: Editor): Promise<void> {
		const updatedBody = removeTransientAssetSources(currentEditor.getJSON());
		const updatedComments = commentsWithCurrentQuotes(currentEditor);
		if (updatedComments === comments) {
			await onChange(updatedBody);
		} else {
			await onCommentsChange(updatedBody, updatedComments);
		}
	}

	function updatePaperLayout(element: HTMLElement): void {
		if (element.clientWidth <= 0) return;
		const layout = calculateEditorPageLayout(
			trimSize,
			element.clientWidth,
			window.matchMedia('(max-width: 760px)').matches
		);
		pageHeight = layout.pageHeight;
		pageMarginInline = layout.pageMarginInline;
		pageMarginBlock = layout.pageMarginBlock;
		compactPage = layout.compact;
	}

	const observePaper: Attachment<HTMLElement> = (element) => {
		paperElement = element;
		updatePaperLayout(element);
		const resizeObserver = new ResizeObserver(() => {
			updatePaperLayout(element);
			updateSelectionCommentButton();
		});
		resizeObserver.observe(element);

		return () => {
			resizeObserver.disconnect();
			if (paperElement === element) paperElement = undefined;
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
				},
				handleClick: (_view, _position, event) => {
					if (!(event.target instanceof Element)) return false;
					const anchor = event.target.closest<HTMLElement>('[data-comment-thread-id]');
					const threadId = anchor?.dataset.commentThreadId;
					if (!threadId || !comments.some((thread) => thread.id === threadId)) return false;
					activeThreadId = threadId;
					replyText = '';
					commentPanelOpen = true;
					return false;
				}
			},
			onTransaction: ({ transaction }) => {
				if (pendingComment && transaction.docChanged) {
					pendingComment = {
						...pendingComment,
						from: transaction.mapping.map(pendingComment.from, 1),
						to: transaction.mapping.map(pendingComment.to, -1)
					};
				}
				revision += 1;
			},
			onSelectionUpdate: ({ editor: selectedEditor }) => {
				updateSelectionCommentButton(selectedEditor);
			},
			onBlur: () => {
				selectionCommentPosition = undefined;
			},
			onUpdate: ({ editor: updatedEditor }) => {
				if (skipNextSave) {
					skipNextSave = false;
					return;
				}
				if (saveTimer) clearTimeout(saveTimer);
				saveTimer = setTimeout(() => {
					void persistEditorSnapshot(updatedEditor);
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

	function hasTextSelection(): boolean {
		revision;
		if (!editor) return false;
		const { empty, from, to } = editor.state.selection;
		return !empty && Boolean(editor.state.doc.textBetween(from, to, ' ').trim());
	}

	function updateSelectionCommentButton(currentEditor: Editor | undefined = editor): void {
		if (!currentEditor || !paperElement || pendingComment) {
			selectionCommentPosition = undefined;
			return;
		}
		const { empty, from, to } = currentEditor.state.selection;
		if (empty || !currentEditor.state.doc.textBetween(from, to, ' ').trim()) {
			selectionCommentPosition = undefined;
			return;
		}

		const start = currentEditor.view.coordsAtPos(from);
		const end = currentEditor.view.coordsAtPos(to);
		const paperBounds = paperElement.getBoundingClientRect();
		const preferredTop = Math.min(start.top, end.top) - paperBounds.top - 42;
		selectionCommentPosition = {
			top:
				preferredTop >= 8 ? preferredTop : Math.max(start.bottom, end.bottom) - paperBounds.top + 8,
			left: Math.min(Math.max(end.right - paperBounds.left, 58), paperBounds.width - 58)
		};
	}

	function startComment(): void {
		if (!editor) return;
		const { empty, from, to } = editor.state.selection;
		const selectedText = editor.state.doc.textBetween(from, to, ' ').replace(/\s+/g, ' ').trim();
		if (empty || !selectedText) {
			onError('Select some text before adding a comment.');
			return;
		}

		pendingComment = {
			from,
			to,
			quotedText: formatCommentQuote(selectedText)
		};
		newCommentText = '';
		selectionCommentPosition = undefined;
		activeThreadId = undefined;
		commentPanelOpen = true;
	}

	function cancelComment(): void {
		pendingComment = undefined;
		newCommentText = '';
		updateSelectionCommentButton();
	}

	function submitComment(event: SubmitEvent): void {
		event.preventDefault();
		if (!editor || !pendingComment) return;
		const messageBody = newCommentText.trim();
		if (!messageBody) return;

		const draft = pendingComment;
		const docEnd = editor.state.doc.content.size;
		const from = Math.max(1, Math.min(draft.from, docEnd));
		const to = Math.max(from, Math.min(draft.to, docEnd));
		if (from === to || !editor.state.doc.textBetween(from, to, ' ').trim()) {
			onError('That text is no longer available. Select it again to add the comment.');
			cancelComment();
			return;
		}

		const timestamp = new Date().toISOString();
		const threadId = crypto.randomUUID();
		const thread: CommentThread = {
			id: threadId,
			quotedText: draft.quotedText,
			messages: [
				{
					id: crypto.randomUUID(),
					authorName: commentAuthor,
					body: messageBody,
					createdAt: timestamp
				}
			],
			createdAt: timestamp,
			updatedAt: timestamp
		};

		pendingComment = undefined;
		newCommentText = '';
		activeThreadId = threadId;
		skipNextSave = true;
		editor
			.chain()
			.focus()
			.setTextSelection({ from, to })
			.setMark('commentAnchor', { threadId })
			.setTextSelection(to)
			.run();
		onCommentsChange(removeTransientAssetSources(editor.getJSON()), [...comments, thread]);
	}

	function submitReply(event: SubmitEvent, threadId: string): void {
		event.preventDefault();
		if (!editor) return;
		const messageBody = replyText.trim();
		if (!messageBody) return;
		const timestamp = new Date().toISOString();
		const updatedComments = comments.map((thread) =>
			thread.id === threadId
				? {
						...thread,
						messages: [
							...thread.messages,
							{
								id: crypto.randomUUID(),
								authorName: commentAuthor,
								body: messageBody,
								createdAt: timestamp
							}
						],
						updatedAt: timestamp
					}
				: thread
		);
		replyText = '';
		onCommentsChange(removeTransientAssetSources(editor.getJSON()), updatedComments);
	}

	function removeThread(threadId: string): void {
		if (!editor) return;
		if (saveTimer) {
			clearTimeout(saveTimer);
			saveTimer = undefined;
		}

		const range = threadRange(threadId);
		const commentAnchor = editor.schema.marks.commentAnchor;
		if (range && commentAnchor) {
			skipNextSave = true;
			const transaction = editor.state.tr
				.removeMark(range.from, range.to, commentAnchor)
				.setMeta(REMOVE_COMMENT_ANCHOR_META, threadId);
			editor.view.dispatch(transaction);
		}

		if (activeThreadId === threadId) activeThreadId = undefined;
		replyText = '';
		onCommentsChange(
			removeTransientAssetSources(editor.getJSON()),
			comments.filter((thread) => thread.id !== threadId)
		);
	}

	function deleteThread(thread: CommentThread): void {
		const messageCount = thread.messages.length;
		const confirmed = window.confirm(
			`Delete this conversation? Your writing will stay, but the highlight and ${messageCount} ${messageCount === 1 ? 'comment' : 'comments'} will be removed.`
		);
		if (confirmed) removeThread(thread.id);
	}

	function deleteMessage(thread: CommentThread, messageId: string): void {
		const onlyMessage = thread.messages.length === 1;
		const confirmed = window.confirm(
			onlyMessage
				? 'Delete this comment? It is the only one here, so the highlight will also be removed.'
				: 'Delete this comment? This cannot be undone.'
		);
		if (!confirmed || !editor) return;
		if (onlyMessage) {
			removeThread(thread.id);
			return;
		}

		if (saveTimer) {
			clearTimeout(saveTimer);
			saveTimer = undefined;
		}
		const timestamp = new Date().toISOString();
		const updatedComments = comments.map((candidate) =>
			candidate.id === thread.id
				? {
						...candidate,
						messages: candidate.messages.filter((message) => message.id !== messageId),
						updatedAt: timestamp
					}
				: candidate
		);
		onCommentsChange(removeTransientAssetSources(editor.getJSON()), updatedComments);
	}

	function commentDeleteLabel(body: string): string {
		const normalized = body.replace(/\s+/g, ' ').trim();
		const excerpt = normalized.length > 72 ? `${normalized.slice(0, 69)}…` : normalized;
		return `Delete comment: ${excerpt}`;
	}

	function commentsWithCurrentQuotes(currentEditor: Editor): CommentThread[] {
		const anchors = commentAnchorSnapshots(currentEditor.state.doc);
		let changed = false;
		const updatedComments = comments.map((thread) => {
			const quotedText = anchors.get(thread.id)?.quotedText;
			if (!quotedText || quotedText === thread.quotedText) return thread;
			changed = true;
			return { ...thread, quotedText };
		});
		return changed ? updatedComments : comments;
	}

	function threadRange(threadId: string): { from: number; to: number } | undefined {
		const anchor = liveCommentAnchors.get(threadId);
		return anchor ? { from: anchor.from, to: anchor.to } : undefined;
	}

	function threadQuote(thread: CommentThread): string {
		return liveCommentAnchors.get(thread.id)?.quotedText || thread.quotedText;
	}

	function goToThread(threadId: string): void {
		activeThreadId = threadId;
		replyText = '';
		commentPanelOpen = true;
		const range = threadRange(threadId);
		if (range) editor?.chain().focus().setTextSelection(range).scrollIntoView().run();
	}

	function formatCommentDate(value: string): string {
		const date = new Date(value);
		const months = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec'
		];
		return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
	}

	function commitFocusTitle(event: FocusEvent): void {
		onTitleCommit((event.currentTarget as HTMLInputElement).value);
	}

	function blurFocusTitleOnEnter(event: KeyboardEvent): void {
		if (event.key === 'Enter') (event.currentTarget as HTMLInputElement).blur();
	}

	function textExcerpt(value: string, offset = 0): string {
		const start = Math.max(0, offset - 32);
		const words = value
			.slice(start, start + 240)
			.replace(/\s+/g, ' ')
			.trim()
			.split(' ');
		if (start > 0) words.shift();
		return words.slice(0, 24).join(' ');
	}

	function visibleTextAnchor(): string {
		const writingSurface = editor?.view.dom;
		const editorArea = paperElement?.closest<HTMLElement>('.editor-area');
		if (!writingSurface || !editorArea) return '';

		const areaBounds = editorArea.getBoundingClientRect();
		const toolbarBounds = editorArea
			.querySelector<HTMLElement>('.toolbar')
			?.getBoundingClientRect();
		const surfaceBounds = writingSurface.getBoundingClientRect();
		const surfaceStyle = getComputedStyle(writingSurface);
		const viewportTop = Math.max(areaBounds.top, toolbarBounds?.bottom ?? areaBounds.top) + 10;
		const viewportBottom = areaBounds.bottom - 10;
		const contentLeft =
			surfaceBounds.left + Number.parseFloat(surfaceStyle.paddingInlineStart || '0') + 8;
		const samplePoints = [
			contentLeft,
			contentLeft + (surfaceBounds.right - contentLeft) * 0.35,
			contentLeft + (surfaceBounds.right - contentLeft) * 0.7
		];
		type CaretDocument = Document & {
			caretPositionFromPoint?: (
				x: number,
				y: number
			) => { offsetNode: Node; offset: number } | null;
			caretRangeFromPoint?: (x: number, y: number) => Range | null;
		};
		const caretDocument = document as CaretDocument;

		for (const x of samplePoints) {
			const position = caretDocument.caretPositionFromPoint?.(x, viewportTop);
			const fallbackRange = position
				? undefined
				: caretDocument.caretRangeFromPoint?.(x, viewportTop);
			const node = position?.offsetNode ?? fallbackRange?.startContainer;
			const offset = position?.offset ?? fallbackRange?.startOffset;
			if (!node || offset === undefined || !writingSurface.contains(node)) continue;
			const nodeElement = node instanceof Element ? node : node.parentElement;
			const block = nodeElement?.closest<HTMLElement>('p, h1, h2, h3, blockquote, li');
			if (!block || !writingSurface.contains(block)) continue;

			const range = document.createRange();
			range.selectNodeContents(block);
			try {
				range.setEnd(node, offset);
			} catch {
				continue;
			}
			const excerpt = textExcerpt(block.textContent ?? '', range.toString().length);
			if (excerpt) return excerpt;
		}

		const visibleBlocks = Array.from(
			writingSurface.querySelectorAll<HTMLElement>('p, h1, h2, h3, blockquote, li')
		).filter((block) => {
			const bounds = block.getBoundingClientRect();
			return (
				bounds.bottom > viewportTop && bounds.top < viewportBottom && block.textContent?.trim()
			);
		});
		return textExcerpt(visibleBlocks[0]?.textContent ?? '');
	}

	async function requestPdfPreview(): Promise<void> {
		if (!editor || pdfPreviewLoading) return;
		const anchorText = visibleTextAnchor();
		if (saveTimer) {
			clearTimeout(saveTimer);
			saveTimer = undefined;
		}
		try {
			await persistEditorSnapshot(editor);
			await onPreviewPdf(anchorText);
		} catch {
			onError('The book preview could not be prepared. Please try again.');
		}
	}
</script>

<div class="editor-shell writing-view" class:distraction-free={distractionFree}>
	{#if distractionFree}
		<div class="focus-topbar" aria-label="Focus mode controls">
			<div class="focus-navigation-slot">{@render focusNavigation()}</div>
			<input
				class="focus-title"
				aria-label="Page title in focus mode"
				value={itemTitle}
				onblur={commitFocusTitle}
				onkeydown={blurFocusTitleOnEnter}
			/>
			<button
				type="button"
				class="focus-exit-button"
				aria-label="Leave focus mode"
				title="Leave focus mode"
				onclick={onToggleDistractionFree}><Minimize2 size={18} /></button
			>
		</div>
	{/if}

	<div class="toolbar" aria-label="Writing tools">
		<select
			class="block-select"
			aria-label="Text style"
			value={currentBlock()}
			onchange={applyBlock}
		>
			<option value="paragraph">Body text</option>
			<option value="heading-1">Large heading</option>
			<option value="heading-2">Medium heading</option>
			<option value="heading-3">Small heading</option>
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
			aria-label="Quotation"
			aria-pressed={isActive('blockquote')}
			onclick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={18} /></button
		>
		<span class="divider"></span>
		<button type="button" aria-label="Add a picture" onclick={() => mediaInput?.click()}
			><ImagePlus size={18} /></button
		>
		<input
			class="screen-reader-only"
			{@attach captureMediaInput}
			type="file"
			accept={MEDIA_ACCEPT_ATTRIBUTE}
			onchange={insertMedia}
		/>
		<span class="divider"></span>
		<button
			type="button"
			aria-label="Add comment to selected text"
			title={hasTextSelection() ? 'Add comment' : 'Select text to comment on'}
			disabled={!hasTextSelection()}
			onclick={startComment}><MessageSquarePlus size={18} /></button
		>
		<button
			type="button"
			class:active={commentPanelOpen}
			aria-label={`Show comments (${comments.length})`}
			aria-pressed={commentPanelOpen}
			onclick={() => (commentPanelOpen = !commentPanelOpen)}
		>
			<MessagesSquare size={18} />
			{#if comments.length > 0}<span class="comment-count">{comments.length}</span>{/if}
		</button>
		<span class="toolbar-spacer"></span>
		<button
			type="button"
			class="preview-button"
			aria-label="Preview finished book"
			title="See how the finished book will look at this passage"
			disabled={pdfPreviewLoading}
			onclick={requestPdfPreview}
		>
			{#if pdfPreviewLoading}
				<span class="preview-spinner"><LoaderCircle size={17} /></span>
			{:else}
				<BookOpen size={17} />
			{/if}
			<span class="preview-button-label">Preview book</span>
		</button>
		<span class="divider"></span>
		{#if !distractionFree}
			<button
				type="button"
				aria-label="Start focus mode"
				aria-pressed="false"
				title="Write without distractions"
				onclick={onToggleDistractionFree}><Maximize2 size={18} /></button
			>
			<span class="divider"></span>
		{/if}
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

	<div class="editor-layout" class:comments-open={commentPanelOpen}>
		<div class="writing-column">
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
						aria-label="Book page heading"
						{@attach observeDocumentHeading}
					>
						{#if typesetHeading.label}
							<p>{typesetHeading.label}</p>
						{/if}
						{#if typesetHeading.title}<h1>{typesetHeading.title}</h1>{/if}
					</div>
				{/if}
				<div class="editor-mount" {@attach mountEditor}></div>
				{#if selectionCommentPosition && !pendingComment}
					<button
						type="button"
						class="selection-comment-button"
						aria-label="Comment on selected text"
						style:top={`${selectionCommentPosition.top}px`}
						style:left={`${selectionCommentPosition.left}px`}
						onpointerdown={(event) => event.preventDefault()}
						onclick={startComment}
					>
						<MessageSquarePlus size={15} /> Comment
					</button>
				{/if}
			</div>
		</div>

		{#if commentPanelOpen}
			<aside class="comments-panel" aria-label="Comments panel">
				<header class="comments-header">
					<div>
						<p class="comments-eyebrow">Discussion</p>
						<h2>Comments <span>{comments.length}</span></h2>
					</div>
					<button
						type="button"
						aria-label="Close comments"
						onclick={() => (commentPanelOpen = false)}><X size={18} /></button
					>
				</header>

				{#if pendingComment}
					<form class="new-comment" onsubmit={submitComment}>
						<p class="anchor-quote">“{pendingComment.quotedText}”</p>
						<label for="new-comment">Add a comment</label>
						<textarea
							id="new-comment"
							rows="3"
							maxlength="2000"
							placeholder="What do you want to remember or discuss?"
							bind:value={newCommentText}></textarea>
						<div class="comment-form-actions">
							<button type="button" class="secondary-button" onclick={cancelComment}>Cancel</button>
							<button type="submit" class="primary-button" disabled={!newCommentText.trim()}
								><MessageSquarePlus size={15} /> Comment</button
							>
						</div>
					</form>
				{/if}

				{#if comments.length === 0 && !pendingComment}
					<div class="comments-empty">
						<MessagesSquare size={24} />
						<p>No comments yet.</p>
						<small>Select some writing, then use the comment button.</small>
					</div>
				{:else}
					<div class="comment-list">
						{#each comments as thread (thread.id)}
							<article class="comment-thread" class:active={activeThreadId === thread.id}>
								<div class="thread-anchor-row">
									<button
										type="button"
										class="thread-anchor"
										aria-label={`Go to comment on: ${threadQuote(thread)}`}
										onclick={() => goToThread(thread.id)}
									>
										<span>“{threadQuote(thread)}”</span>
										{#if threadRange(thread.id)}
											<CornerDownRight size={14} />
										{:else}
											<small>Original text removed</small>
										{/if}
									</button>
									<button
										type="button"
										class="delete-thread-button"
										aria-label={`Delete conversation about: ${threadQuote(thread)}`}
										title="Delete conversation"
										onclick={() => deleteThread(thread)}
									>
										<Trash2 size={14} />
									</button>
								</div>
								<div class="thread-messages">
									{#each thread.messages as message (message.id)}
										<div class="comment-message">
											<p class="message-meta">
												<strong>{message.authorName}</strong>
												<span class="message-actions">
													<span>{formatCommentDate(message.createdAt)}</span>
													<button
														type="button"
														class="delete-comment-button"
														aria-label={commentDeleteLabel(message.body)}
														title="Delete this comment"
														onclick={() => deleteMessage(thread, message.id)}
													>
														<Trash2 size={12} />
													</button>
												</span>
											</p>
											<p>{message.body}</p>
										</div>
									{/each}
								</div>
								{#if activeThreadId === thread.id}
									<form class="reply-form" onsubmit={(event) => submitReply(event, thread.id)}>
										<label for={`reply-${thread.id}`}>Reply</label>
										<div>
											<textarea
												id={`reply-${thread.id}`}
												rows="2"
												maxlength="2000"
												placeholder="Write a reply…"
												bind:value={replyText}></textarea>
											<button type="submit" aria-label="Send reply" disabled={!replyText.trim()}
												><Send size={16} /></button
											>
										</div>
									</form>
								{/if}
							</article>
						{/each}
					</div>
				{/if}
			</aside>
		{/if}
	</div>
</div>

<style>
	.editor-shell {
		--focus-topbar-height: calc(3.25rem + var(--safe-area-top, env(safe-area-inset-top)));
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

	.editor-shell.distraction-free .toolbar {
		top: var(--focus-topbar-height);
		padding-right: max(0.75rem, var(--safe-area-right, env(safe-area-inset-right)));
		padding-left: max(0.75rem, var(--safe-area-left, env(safe-area-inset-left)));
	}

	.focus-topbar {
		position: sticky;
		z-index: 6;
		top: 0;
		display: grid;
		min-height: var(--focus-topbar-height);
		grid-template-columns: minmax(10rem, 1fr) minmax(14rem, 32rem) minmax(10rem, 1fr);
		align-items: center;
		gap: 0.75rem;
		padding: calc(0.4rem + var(--safe-area-top, env(safe-area-inset-top)))
			max(0.75rem, var(--safe-area-right, env(safe-area-inset-right))) 0.4rem
			max(0.75rem, var(--safe-area-left, env(safe-area-inset-left)));
		background: rgb(251 248 242 / 98%);
		border-bottom: 1px solid var(--line);
		backdrop-filter: blur(12px);
	}

	.focus-title {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		padding: 0.42rem 0.75rem;
		color: var(--ink);
		text-align: center;
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.45rem;
		font-family: 'Libre Baskerville', serif;
		font-size: 0.88rem;
		font-weight: 700;
	}

	.focus-title:focus {
		border-color: var(--forest);
		outline: 2px solid rgb(39 72 59 / 12%);
	}

	.focus-exit-button {
		display: grid;
		width: 2.15rem;
		height: 2.15rem;
		justify-self: end;
		place-items: center;
		padding: 0;
		color: var(--ink-soft);
		background: transparent;
		border: 0;
		border-radius: 0.42rem;
	}

	.focus-exit-button:hover {
		color: var(--forest-deep);
		background: rgb(39 72 59 / 11%);
	}

	.toolbar button,
	.image-toolbar button {
		position: relative;
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

	.toolbar .preview-button {
		display: inline-flex;
		width: auto;
		min-width: 7.25rem;
		gap: 0.4rem;
		padding: 0 0.45rem;
		font-size: 0.7rem;
		font-weight: 750;
	}

	.preview-spinner {
		display: grid;
		animation: preview-spin 900ms linear infinite;
	}

	.toolbar button:disabled,
	.image-toolbar button:disabled {
		color: #a9ada9;
		background: transparent;
		cursor: not-allowed;
		opacity: 0.55;
	}

	.comment-count {
		position: absolute;
		top: 0.05rem;
		right: 0.05rem;
		display: grid;
		min-width: 0.9rem;
		height: 0.9rem;
		place-items: center;
		padding: 0 0.18rem;
		color: white;
		background: var(--forest);
		border-radius: 999px;
		font-size: 0.55rem;
		font-weight: 800;
		line-height: 1;
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

	.focus-navigation-slot {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		justify-self: start;
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

	.editor-layout {
		display: grid;
		min-width: 0;
		align-items: start;
		grid-template-columns: minmax(0, 1fr);
	}

	.editor-layout.comments-open {
		grid-template-columns: minmax(0, 1fr) minmax(18rem, 20rem);
	}

	.writing-column {
		min-width: 0;
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

	.editor-shell.distraction-free .paper {
		width: min(64rem, calc(100% - 3rem));
		margin-top: 2.5rem;
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
		text-align: justify;
		text-align-last: left;
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

	.editor-shell.writing-view .editor-mount :global(.writing-surface) {
		hyphens: none;
		overflow-wrap: break-word;
		text-wrap: wrap;
	}

	.editor-shell.writing-view .editor-mount :global(.writing-surface p) {
		margin-bottom: 0.9em;
		text-align: left;
		text-align-last: auto;
	}

	.editor-shell.writing-view .editor-mount :global(.writing-surface p + p) {
		text-indent: 0;
	}

	.editor-mount :global(.writing-surface .comment-anchor) {
		padding: 0.05em 0;
		color: inherit;
		background: linear-gradient(to bottom, transparent 38%, rgb(239 194 68 / 46%) 38%);
		border-radius: 0.12em;
		box-decoration-break: clone;
		cursor: pointer;
		-webkit-box-decoration-break: clone;
	}

	.editor-mount :global(.writing-surface .comment-anchor:hover) {
		background-color: rgb(239 194 68 / 24%);
	}

	.selection-comment-button {
		position: absolute;
		z-index: 8;
		display: inline-flex;
		min-height: 2.1rem;
		align-items: center;
		gap: 0.38rem;
		padding: 0.4rem 0.7rem;
		color: white;
		background: var(--forest-deep);
		border: 1px solid rgb(255 255 255 / 24%);
		border-radius: 0.5rem;
		box-shadow: 0 7px 20px rgb(26 39 33 / 28%);
		font-size: 0.72rem;
		font-weight: 780;
		line-height: 1;
		transform: translateX(-50%);
	}

	.selection-comment-button:hover {
		background: var(--forest);
		transform: translateX(-50%) translateY(-1px);
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

	.comments-panel {
		position: sticky;
		z-index: 4;
		top: 3.7rem;
		display: flex;
		max-height: calc(100vh - 11rem);
		min-height: 14rem;
		margin: 1rem 1rem 2rem 0;
		flex-direction: column;
		overflow: hidden;
		background: #fbf8f2;
		border: 1px solid #d8d1c6;
		border-radius: 0.85rem;
		box-shadow: 0 12px 30px rgb(47 48 43 / 12%);
	}

	.comments-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.9rem 1rem;
		background: #f5f0e7;
		border-bottom: 1px solid #ddd5ca;
	}

	.comments-header h2,
	.comments-header p {
		margin: 0;
	}

	.comments-header h2 {
		color: var(--ink);
		font-size: 1rem;
	}

	.comments-header h2 span {
		color: var(--ink-soft);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.comments-eyebrow {
		margin-bottom: 0.1rem !important;
		color: #8b6b1f;
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	.comments-header button {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		padding: 0;
		color: var(--ink-soft);
		background: transparent;
		border: 0;
		border-radius: 0.4rem;
	}

	.comments-header button:hover {
		color: var(--ink);
		background: rgb(39 72 59 / 8%);
	}

	.new-comment {
		padding: 0.9rem;
		background: #fffdf8;
		border-bottom: 1px solid #ddd5ca;
	}

	.anchor-quote,
	.thread-anchor span {
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}

	.anchor-quote {
		margin: 0 0 0.8rem;
		padding-left: 0.65rem;
		color: #6c5a2a;
		border-left: 3px solid #e0b942;
		font-family: 'Libre Baskerville', serif;
		font-size: 0.78rem;
		font-style: italic;
		line-height: 1.5;
	}

	.new-comment label,
	.reply-form label {
		display: block;
		margin-bottom: 0.3rem;
		color: var(--ink-soft);
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.new-comment textarea,
	.reply-form textarea {
		box-sizing: border-box;
		width: 100%;
		padding: 0.55rem 0.65rem;
		resize: vertical;
		color: var(--ink);
		background: white;
		border: 1px solid #cec6ba;
		border-radius: 0.5rem;
		font: inherit;
		font-size: 0.8rem;
		line-height: 1.45;
	}

	.new-comment textarea:focus,
	.reply-form textarea:focus {
		border-color: var(--forest);
		outline: 2px solid rgb(39 72 59 / 12%);
	}

	.comment-form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.45rem;
		margin-top: 0.55rem;
	}

	.comment-form-actions button {
		display: inline-flex;
		min-height: 2rem;
		align-items: center;
		gap: 0.35rem;
		padding: 0.38rem 0.65rem;
		border-radius: 0.45rem;
		font-size: 0.72rem;
		font-weight: 750;
	}

	.secondary-button {
		color: var(--ink-soft);
		background: transparent;
		border: 1px solid #d4ccc0;
	}

	.primary-button {
		color: white;
		background: var(--forest);
		border: 1px solid var(--forest);
	}

	.primary-button:disabled,
	.reply-form button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.comments-empty {
		display: grid;
		place-items: center;
		padding: 2.8rem 1.4rem;
		color: #8a8f8a;
		text-align: center;
	}

	.comments-empty p {
		margin: 0.65rem 0 0.2rem;
		color: var(--ink);
		font-weight: 750;
	}

	.comments-empty small {
		max-width: 15rem;
		line-height: 1.45;
	}

	.comment-list {
		min-height: 0;
		padding: 0.75rem;
		overflow-y: auto;
	}

	.comment-thread {
		margin-bottom: 0.65rem;
		overflow: hidden;
		background: white;
		border: 1px solid #ddd6ca;
		border-radius: 0.65rem;
		transition:
			border-color 120ms ease,
			box-shadow 120ms ease;
	}

	.comment-thread.active {
		border-color: #c7a13a;
		box-shadow: 0 0 0 2px rgb(224 185 66 / 15%);
	}

	.thread-anchor {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.58rem 0.7rem;
		color: #695827;
		background: transparent;
		border: 0;
		font-family: 'Libre Baskerville', serif;
		font-size: 0.69rem;
		font-style: italic;
		line-height: 1.4;
		text-align: left;
	}

	.thread-anchor-row {
		display: flex;
		align-items: stretch;
		background: #faf5e7;
		border-bottom: 1px solid #e6ddc8;
	}

	.delete-thread-button {
		display: grid;
		flex: 0 0 2.35rem;
		place-items: center;
		padding: 0;
		color: #8a7660;
		background: transparent;
		border: 0;
		border-left: 1px solid #e6ddc8;
	}

	.delete-thread-button:hover,
	.delete-comment-button:hover {
		color: #a13f35;
		background: rgb(161 63 53 / 8%);
	}

	.thread-anchor span {
		flex: 1;
	}

	.thread-anchor :global(svg) {
		flex: 0 0 auto;
	}

	.thread-anchor small {
		flex: 0 0 auto;
		max-width: 4.5rem;
		color: #9b594f;
		font-family: 'Manrope', sans-serif;
		font-size: 0.58rem;
		font-style: normal;
		line-height: 1.2;
		text-align: right;
	}

	.thread-messages {
		padding: 0.15rem 0.7rem;
	}

	.comment-message {
		padding: 0.65rem 0;
		border-bottom: 1px solid #eee9e1;
	}

	.comment-message:last-child {
		border-bottom: 0;
	}

	.comment-message p {
		margin: 0;
		color: var(--ink);
		font-size: 0.78rem;
		line-height: 1.5;
		white-space: pre-wrap;
	}

	.comment-message .message-meta {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.3rem;
		color: var(--ink-soft);
		font-size: 0.63rem;
	}

	.message-meta strong {
		color: var(--forest-deep);
		font-size: 0.7rem;
	}

	.message-actions {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.delete-comment-button {
		display: grid;
		width: 1.65rem;
		height: 1.65rem;
		place-items: center;
		padding: 0;
		color: #8a7660;
		background: transparent;
		border: 0;
		border-radius: 0.35rem;
	}

	.reply-form {
		padding: 0.65rem 0.7rem 0.75rem;
		background: #faf8f3;
		border-top: 1px solid #eee9e1;
	}

	.reply-form > div {
		display: flex;
		align-items: end;
		gap: 0.35rem;
	}

	.reply-form textarea {
		min-height: 3.4rem;
		resize: none;
	}

	.reply-form button {
		display: grid;
		flex: 0 0 auto;
		width: 2.1rem;
		height: 2.1rem;
		place-items: center;
		padding: 0;
		color: white;
		background: var(--forest);
		border: 0;
		border-radius: 0.45rem;
	}

	@media (max-width: 980px) {
		.editor-layout.comments-open {
			grid-template-columns: minmax(0, 1fr);
		}

		.comments-panel {
			position: fixed;
			z-index: 20;
			top: clamp(6.5rem, 14vh, 9rem);
			right: 0.75rem;
			bottom: 2.25rem;
			width: min(22rem, calc(100vw - 1.5rem));
			max-height: none;
			margin: 0;
		}
	}

	@media (max-width: 760px) {
		.preview-button-label {
			display: none;
		}

		.toolbar .preview-button {
			min-width: 2.15rem;
		}

		.focus-topbar {
			grid-template-columns: minmax(3.25rem, 1fr) minmax(8rem, 1.6fr) minmax(3.25rem, 1fr);
			gap: 0.4rem;
			padding-right: max(0.5rem, var(--safe-area-right, env(safe-area-inset-right)));
			padding-left: max(0.5rem, var(--safe-area-left, env(safe-area-inset-left)));
		}

		.focus-title {
			padding-inline: 0.45rem;
			font-size: 0.78rem;
		}

		.editor-shell.distraction-free .paper {
			width: 100%;
			margin: 0;
			min-height: calc(100dvh - var(--focus-topbar-height) - 3rem);
			box-shadow: none;
		}

		.comments-panel {
			top: 7rem;
			right: 0;
			bottom: 2rem;
			width: 100vw;
			border-right: 0;
			border-left: 0;
			border-radius: 0;
		}
	}

	@keyframes preview-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
