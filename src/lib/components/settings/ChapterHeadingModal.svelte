<script lang="ts">
	import { untrack } from 'svelte';
	import type { ChapterHeadingSettings, ManuscriptDocument, NovelProject } from '$lib/domain/types';
	import { bookChapterHeading } from '$lib/domain/chapter-headings';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ChapterHeadingBuilder from './ChapterHeadingBuilder.svelte';

	type Props = {
		project: NovelProject;
		document: ManuscriptDocument;
		chapterNumber: number;
		onSave: (value: ChapterHeadingSettings | undefined) => Promise<void>;
		onClose: () => void;
	};

	let { project, document, chapterNumber, onSave, onClose }: Props = $props();
	const startingOverride = untrack(() => document.chapterHeadingOverride);
	const startingSettings = untrack(() => startingOverride ?? bookChapterHeading(project));
	let useBookDefaults = $state(startingOverride === undefined);
	let settings = $state<ChapterHeadingSettings>({ ...startingSettings });
	let saving = $state(false);

	async function save(): Promise<void> {
		saving = true;
		try {
			await onSave(useBookDefaults ? undefined : { ...settings });
			onClose();
		} finally {
			saving = false;
		}
	}
</script>

<Modal
	title="Chapter heading"
	description="Choose what appears above this chapter in the finished book."
	{onClose}
>
	<div class="modal-body">
		<label class="inherit-toggle">
			<input type="checkbox" bind:checked={useBookDefaults} />
			<span
				><strong>Use book-wide heading style</strong><small
					>Turn this off to make this chapter different.</small
				></span
			>
		</label>

		<ChapterHeadingBuilder
			value={useBookDefaults ? bookChapterHeading(project) : settings}
			{chapterNumber}
			chapterTitle={document.title}
			disabled={useBookDefaults}
			onChange={(value) => (settings = value)}
		/>

		<div class="actions">
			<button class="button button-secondary" type="button" onclick={onClose}>Cancel</button>
			<button class="button button-primary" type="button" disabled={saving} onclick={save}
				>{saving ? 'Saving…' : 'Save chapter heading'}</button
			>
		</div>
	</div>
</Modal>

<style>
	.modal-body {
		display: grid;
		gap: 1.25rem;
	}

	.inherit-toggle {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		padding: 0.8rem;
		background: rgb(39 72 59 / 6%);
		border: 1px solid rgb(39 72 59 / 18%);
		border-radius: 0.55rem;
	}

	.inherit-toggle input {
		width: 1rem;
		height: 1rem;
		margin-top: 0.1rem;
		accent-color: var(--forest);
	}

	.inherit-toggle span,
	.inherit-toggle small {
		display: block;
	}

	.inherit-toggle small {
		margin-top: 0.2rem;
		color: var(--ink-soft);
		font-size: 0.72rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.65rem;
		padding-top: 1rem;
		border-top: 1px solid var(--line);
	}
</style>
