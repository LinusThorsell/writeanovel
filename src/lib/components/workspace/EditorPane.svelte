<script lang="ts">
	import { ArrowDown, ArrowUp, Cloud, CloudOff, HardDrive, Trash2 } from '@lucide/svelte';
	import type { WriteANovelState } from '$lib/application/writeanovel-state.svelte';
	import { preserveEditorScrollPosition } from '$lib/application/editor-scroll-position';
	import type { SyncStatus } from '$lib/domain/types';
	import { richTextToPlainText } from '$lib/export/rich-text-html';
	import RichTextEditor from '$lib/components/editor/RichTextEditor.svelte';

	let { model }: { model: WriteANovelState } = $props();

	function commitTitle(event: FocusEvent): void {
		model.updateActiveTitle((event.currentTarget as HTMLInputElement).value);
	}

	function blurOnEnter(event: KeyboardEvent): void {
		if (event.key === 'Enter') (event.currentTarget as HTMLInputElement).blur();
	}

	function commitSummary(event: FocusEvent): void {
		if (model.activeNote) {
			model.updateNoteSummary(
				model.activeNote.id,
				(event.currentTarget as HTMLTextAreaElement).value
			);
		}
	}

	function requestDelete(): void {
		const label = model.activeDocument?.title ?? model.activeNote?.title ?? 'this item';
		if (window.confirm(`Delete “${label}”? This cannot be undone.`)) model.deleteActiveItem();
	}

	function syncLabel(status: SyncStatus): string {
		switch (status) {
			case 'local':
				return 'Saved on this device';
			case 'offline':
				return 'Offline — changes are safe';
			case 'syncing':
				return 'Saving to cloud…';
			case 'synced':
				return 'Saved to cloud';
			case 'error':
				return 'Cloud save will retry';
		}
	}

	function wordCount(): number {
		const body = model.activeDocument?.body ?? model.activeNote?.body;
		if (!body) return 0;
		const plain = richTextToPlainText(body).trim();
		return plain ? plain.split(/\s+/).length : 0;
	}
</script>

<main>
	{#if model.activeDocument || model.activeNote}
		<header class="item-header">
			<div class="title-area">
				<p class="eyebrow">
					{#if model.activeDocument?.kind === 'chapter'}Chapter {model.chapterNumber(
							model.activeDocument.id
						)}{:else if model.activeDocument}Book page{:else}{model.activeNote?.kind}{/if}
				</p>
				<input
					class="item-title"
					aria-label="Page title"
					value={model.activeDocument?.title ?? model.activeNote?.title ?? ''}
					onblur={commitTitle}
					onkeydown={blurOnEnter}
				/>
			</div>
			<div class="item-actions">
				{#if model.activeDocument}
					<button
						class="icon-button"
						type="button"
						aria-label="Move up"
						title="Move up"
						onclick={() => model.moveActiveDocument(-1)}><ArrowUp size={18} /></button
					>
					<button
						class="icon-button"
						type="button"
						aria-label="Move down"
						title="Move down"
						onclick={() => model.moveActiveDocument(1)}><ArrowDown size={18} /></button
					>
				{/if}
				<button
					class="icon-button delete"
					type="button"
					aria-label="Delete this item"
					title="Delete"
					onclick={requestDelete}><Trash2 size={18} /></button
				>
			</div>
		</header>

		{#if model.activeNote}
			<div class="note-summary">
				<label for="note-summary">Quick summary</label>
				<textarea
					id="note-summary"
					rows="2"
					placeholder="A short reminder you can scan later…"
					value={model.activeNote.summary}
					onblur={commitSummary}></textarea>
			</div>
		{/if}

		<div
			class="editor-area"
			{@attach preserveEditorScrollPosition(model.activeDocument?.id ?? model.activeNote?.id)}
		>
			{#if model.activeDocument}
				{#key model.activeDocument.id}
					<RichTextEditor
						body={model.activeDocument.body}
						assetUrls={model.assetUrls}
						typography={model.workspace?.project.typography ?? 'literary'}
						trimSize={model.workspace?.project.trimSize ?? 'trade-6x9'}
						placeholder={model.activeDocument.kind === 'chapter'
							? 'Begin this chapter…'
							: 'Write this page…'}
						onChange={(body) => model.updateDocumentBody(model.activeDocument!.id, body)}
						onAddMedia={(file) => model.addMedia(file)}
						onError={(message) => model.showError(message)}
					/>
				{/key}
			{:else if model.activeNote}
				{#key model.activeNote.id}
					<RichTextEditor
						body={model.activeNote.body}
						assetUrls={model.assetUrls}
						typography="modern"
						trimSize={model.workspace?.project.trimSize ?? 'trade-6x9'}
						placeholder="Add details, ideas, relationships, and reminders…"
						onChange={(body) => model.updateNoteBody(model.activeNote!.id, body)}
						onAddMedia={(file) => model.addMedia(file)}
						onError={(message) => model.showError(message)}
					/>
				{/key}
			{/if}
		</div>

		<footer class="status-bar">
			<span>{wordCount().toLocaleString()} words</span>
			<span class="save-state">
				{#if model.syncStatus === 'local'}<HardDrive
						size={14}
					/>{:else if model.syncStatus === 'offline' || model.syncStatus === 'error'}<CloudOff
						size={14}
					/>{:else}<Cloud size={14} />{/if}
				{syncLabel(model.syncStatus)}
			</span>
		</footer>
	{:else}
		<div class="empty-editor">
			<div>
				<HardDrive size={28} />
				<h2>Choose something to write</h2>
				<p>Select a chapter, book page, or story note from the sidebar.</p>
			</div>
		</div>
	{/if}
</main>

<style>
	main {
		position: relative;
		display: flex;
		min-width: 0;
		min-height: 0;
		height: 100%;
		flex-direction: column;
		overflow: hidden;
		background: #e9e4db;
	}

	.item-header {
		display: flex;
		min-height: 4.6rem;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.55rem 1.15rem;
		background: var(--paper);
		border-bottom: 1px solid var(--line);
	}

	.title-area {
		min-width: 0;
		flex: 1;
	}

	.item-title {
		width: min(38rem, 100%);
		padding: 0.2rem 0;
		color: var(--ink);
		background: transparent;
		border: 0;
		border-bottom: 1px solid transparent;
		font-family: 'Libre Baskerville', serif;
		font-size: 1.18rem;
		font-weight: 700;
	}

	.item-title:hover,
	.item-title:focus {
		border-bottom-color: var(--line);
	}

	.item-actions {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}

	.delete:hover {
		color: var(--danger);
		background: rgb(158 64 56 / 9%);
	}

	.note-summary {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 0.8rem;
		padding: 0.7rem 1.15rem;
		background: #f6f2eb;
		border-bottom: 1px solid var(--line);
	}

	.note-summary label {
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}

	.note-summary textarea {
		width: 100%;
		padding: 0.5rem 0.65rem;
		resize: vertical;
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.5rem;
	}

	.editor-area {
		min-width: 0;
		min-height: 0;
		flex: 1;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.status-bar {
		display: flex;
		min-height: 2rem;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.9rem;
		color: var(--ink-soft);
		background: rgb(251 248 242 / 96%);
		border-top: 1px solid var(--line);
		font-size: 0.7rem;
	}

	.save-state {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.empty-editor {
		display: grid;
		height: 100%;
		place-items: center;
		padding: 2rem;
		color: var(--ink-soft);
		text-align: center;
	}

	.empty-editor h2 {
		margin: 0.8rem 0 0.3rem;
		font-family: 'Libre Baskerville', serif;
		color: var(--ink);
	}

	.empty-editor p {
		margin: 0;
	}

	@media (max-width: 760px) {
		.item-header {
			padding: 0.55rem 0.75rem;
		}

		.note-summary {
			grid-template-columns: 1fr;
		}
	}
</style>
