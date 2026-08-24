<script lang="ts">
	import { chapterLabel } from '$lib/domain/chapter-headings';
	import type { ChapterHeadingSettings } from '$lib/domain/types';

	type Props = {
		value: ChapterHeadingSettings;
		chapterNumber: number;
		chapterTitle: string;
		onChange: (value: ChapterHeadingSettings) => void;
		disabled?: boolean;
	};

	let { value, chapterNumber, chapterTitle, onChange, disabled = false }: Props = $props();

	const previewLabel = $derived(
		value.showLabel ? chapterLabel(value.labelTemplate, chapterNumber) : ''
	);
	const previewTitle = $derived(value.showTitle ? chapterTitle.trim() || 'Untitled chapter' : '');
	const showPreviewLabel = $derived(
		previewLabel && previewLabel.toLocaleLowerCase() !== previewTitle.toLocaleLowerCase()
	);

	function toggle(key: 'showLabel' | 'showTitle', event: Event): void {
		onChange({ ...value, [key]: (event.currentTarget as HTMLInputElement).checked });
	}

	function updateTemplate(event: Event): void {
		onChange({ ...value, labelTemplate: (event.currentTarget as HTMLInputElement).value });
	}
</script>

<fieldset {disabled}>
	<div class="controls">
		<label class="toggle">
			<input
				type="checkbox"
				checked={value.showLabel}
				onchange={(event) => toggle('showLabel', event)}
			/>
			<span
				><strong>Automatic chapter label</strong><small>Renumbers when chapters move.</small></span
			>
		</label>
		<label class="field">
			<span>Chapter label text</span>
			<input
				aria-label="Chapter label text"
				value={value.labelTemplate}
				disabled={disabled || !value.showLabel}
				oninput={updateTemplate}
			/>
			<small>Use <code>{'{number}'}</code> where the chapter number belongs.</small>
		</label>
		<label class="toggle">
			<input
				type="checkbox"
				checked={value.showTitle}
				onchange={(event) => toggle('showTitle', event)}
			/>
			<span
				><strong>Chapter title</strong><small>Uses the editable page title above the editor.</small
				></span
			>
		</label>
	</div>

	<div class="preview" aria-label="Chapter heading preview">
		<span>Preview</span>
		{#if showPreviewLabel}<p>{previewLabel}</p>{/if}
		{#if previewTitle}<h4>{previewTitle}</h4>{/if}
		{#if !showPreviewLabel && !previewTitle}<em>No heading — the chapter begins with body text.</em
			>{/if}
	</div>
</fieldset>

<style>
	fieldset {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(11rem, 0.75fr);
		gap: 1rem;
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}

	fieldset:disabled {
		opacity: 0.68;
	}

	.controls {
		display: grid;
		gap: 0.75rem;
	}

	.toggle {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		font-size: 0.82rem;
	}

	.toggle input {
		width: 1rem;
		height: 1rem;
		margin-top: 0.1rem;
		accent-color: var(--forest);
	}

	.toggle span,
	.toggle small {
		display: block;
	}

	.toggle small,
	.field small {
		margin-top: 0.2rem;
		color: var(--ink-soft);
		font-size: 0.7rem;
	}

	.field {
		display: grid;
		gap: 0.35rem;
		padding-left: 1.6rem;
		font-size: 0.76rem;
		font-weight: 700;
	}

	.field input {
		width: 100%;
		padding: 0.55rem 0.65rem;
		color: var(--ink);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.45rem;
	}

	code {
		padding: 0.05rem 0.2rem;
		background: #e9e4db;
		border-radius: 0.2rem;
		font-size: 0.68rem;
	}

	.preview {
		min-height: 9rem;
		padding: 0.8rem;
		background: #fffefb;
		border: 1px solid var(--line);
		border-radius: 0.55rem;
		text-align: center;
	}

	.preview > span {
		display: block;
		margin-bottom: 1.6rem;
		color: var(--ink-soft);
		font-family: 'Manrope Variable', sans-serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-align: left;
		text-transform: uppercase;
	}

	.preview p {
		margin: 0 0 0.65rem;
		font-family: 'Libre Baskerville', serif;
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.preview h4 {
		margin: 0;
		font-family: 'Libre Baskerville', serif;
		font-size: 1.1rem;
		font-weight: 400;
	}

	.preview em {
		display: block;
		color: var(--ink-soft);
		font-size: 0.72rem;
		font-style: normal;
	}

	@media (max-width: 560px) {
		fieldset {
			grid-template-columns: 1fr;
		}
	}
</style>
