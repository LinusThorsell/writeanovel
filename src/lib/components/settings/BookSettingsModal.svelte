<script lang="ts">
	import { BookImage, Trash2, Upload } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import type { WriteANovelState } from '$lib/application/writeanovel-state.svelte';
	import { MEDIA_ACCEPT_ATTRIBUTE } from '$lib/application/media-service';
	import type { TrimSize, TypographyPreset } from '$lib/domain/types';
	import Modal from '$lib/components/ui/Modal.svelte';

	let { model }: { model: WriteANovelState } = $props();
	const project = untrack(() => model.workspace!.project);
	let title = $state(project.title);
	let subtitle = $state(project.subtitle);
	let author = $state(project.author);
	let synopsis = $state(project.synopsis);
	let trimSize = $state<TrimSize>(project.trimSize);
	let typography = $state<TypographyPreset>(project.typography);
	let savingCover = $state<'front' | 'back'>();

	function coverUrl(side: 'front' | 'back'): string | undefined {
		const assetId =
			side === 'front'
				? model.workspace?.project.frontCoverAssetId
				: model.workspace?.project.backCoverAssetId;
		return assetId ? model.assetUrls.get(assetId) : undefined;
	}

	async function chooseCover(side: 'front' | 'back', event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		savingCover = side;
		try {
			await model.setCover(side, file);
		} catch (error) {
			model.showError(error instanceof Error ? error.message : 'The cover could not be added.');
		} finally {
			savingCover = undefined;
		}
	}

	async function save(): Promise<void> {
		await model.updateBookSettings({ title, subtitle, author, synopsis, trimSize, typography });
	}

	function deleteBook(): void {
		if (window.confirm(`Delete “${project.title}” and all of its chapters from this device?`)) {
			model.deleteCurrentProject();
			model.settingsOpen = false;
		}
	}
</script>

<Modal
	title="Book settings"
	description="Covers, publication details, and typesetting"
	onClose={() => (model.settingsOpen = false)}
	width="large"
>
	<div class="settings-grid">
		<section class="details">
			<h3>Book details</h3>
			<label class="field"><span>Title</span><input bind:value={title} /></label>
			<label class="field"
				><span>Subtitle</span><input bind:value={subtitle} placeholder="Optional" /></label
			>
			<label class="field"><span>Author name</span><input bind:value={author} /></label>
			<label class="field"
				><span>Synopsis</span><textarea
					bind:value={synopsis}
					placeholder="A private summary of the book"></textarea></label
			>
			<div class="two-fields">
				<label class="field">
					<span>Trim size</span>
					<select bind:value={trimSize}>
						<option value="trade-6x9">Trade — 6 × 9 in</option>
						<option value="a5">A5 — 148 × 210 mm</option>
						<option value="letter">US Letter — 8.5 × 11 in</option>
					</select>
				</label>
				<label class="field">
					<span>Typography</span>
					<select bind:value={typography}>
						<option value="literary">Literary — Libre Baskerville</option>
						<option value="classic">Classic — traditional serif</option>
						<option value="modern">Modern — clean sans serif</option>
					</select>
				</label>
			</div>
			<button class="button button-primary save" type="button" onclick={save}
				>Save book settings</button
			>
		</section>

		<section class="covers">
			<h3>Front and back cover</h3>
			<p class="muted">Upload a JPG, PNG, WebP, GIF, or SVG. Portrait artwork works best.</p>
			<div class="cover-pair">
				{#each ['front', 'back'] as side (side)}
					{@const coverSide = side === 'front' ? 'front' : 'back'}
					<div class="cover-card">
						<div class="cover-preview">
							{#if coverUrl(coverSide)}
								<img src={coverUrl(coverSide)} alt={`${coverSide} cover`} />
							{:else}
								<BookImage size={34} /><span>No {coverSide} cover</span>
							{/if}
						</div>
						<strong>{coverSide === 'front' ? 'Front cover' : 'Back cover'}</strong>
						<label class="button button-secondary upload-button">
							<Upload size={16} />{savingCover === coverSide ? 'Adding…' : 'Choose image'}
							<input
								class="screen-reader-only"
								type="file"
								accept={MEDIA_ACCEPT_ATTRIBUTE}
								disabled={savingCover !== undefined}
								onchange={(event) => chooseCover(coverSide, event)}
							/>
						</label>
						{#if coverUrl(coverSide)}
							<button class="remove-cover" type="button" onclick={() => model.clearCover(coverSide)}
								>Remove cover</button
							>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	</div>

	<div class="danger-zone">
		<div>
			<strong>Delete this novel</strong><span>Removes the project, writing, notes, and media.</span>
		</div>
		<button class="button button-danger" type="button" onclick={deleteBook}
			><Trash2 size={17} />Delete novel</button
		>
	</div>
</Modal>

<style>
	.settings-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(16rem, 0.85fr);
		gap: 2rem;
	}

	section {
		min-width: 0;
	}

	h3 {
		margin: 0 0 1rem;
		font-family: 'Libre Baskerville', serif;
		font-size: 1rem;
	}

	.details {
		display: grid;
		gap: 0.9rem;
	}

	.two-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.8rem;
	}

	.save {
		justify-self: start;
		margin-top: 0.25rem;
	}

	.covers > p {
		margin: -0.5rem 0 1rem;
		font-size: 0.78rem;
	}

	.cover-pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.8rem;
	}

	.cover-card {
		display: grid;
		align-content: start;
		gap: 0.55rem;
		text-align: center;
	}

	.cover-card strong {
		font-size: 0.78rem;
	}

	.cover-preview {
		display: grid;
		aspect-ratio: 2 / 3;
		place-items: center;
		overflow: hidden;
		color: #89928d;
		background: #e9e4db;
		border: 1px dashed #b9b1a3;
		border-radius: 0.55rem;
		font-size: 0.7rem;
	}

	.cover-preview img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		background: white;
	}

	.cover-preview span {
		margin-top: -1.5rem;
	}

	.upload-button {
		position: relative;
		min-height: 2.25rem;
		padding: 0.45rem;
		font-size: 0.72rem;
	}

	.remove-cover {
		justify-self: center;
		padding: 0.2rem;
		color: var(--danger);
		background: transparent;
		border: 0;
		font-size: 0.7rem;
	}

	.danger-zone {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 2rem;
		padding: 1rem;
		background: rgb(158 64 56 / 6%);
		border: 1px solid rgb(158 64 56 / 22%);
		border-radius: 0.7rem;
	}

	.danger-zone strong,
	.danger-zone span {
		display: block;
	}

	.danger-zone span {
		margin-top: 0.18rem;
		color: var(--ink-soft);
		font-size: 0.75rem;
	}

	@media (max-width: 760px) {
		.settings-grid {
			grid-template-columns: 1fr;
		}

		.two-fields {
			grid-template-columns: 1fr;
		}

		.danger-zone {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
