<script lang="ts">
	import { BookImage, Trash2, Upload } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import type { WriteANovelState } from '$lib/application/writeanovel-state.svelte';
	import { MEDIA_ACCEPT_ATTRIBUTE } from '$lib/application/media-service';
	import { bookChapterHeading } from '$lib/domain/chapter-headings';
	import { bookPageNumbering } from '$lib/domain/page-numbering';
	import type {
		ChapterHeadingSettings,
		CoverPosition,
		PageNumberingSettings,
		TrimSize,
		TypographyPreset
	} from '$lib/domain/types';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ChapterHeadingBuilder from './ChapterHeadingBuilder.svelte';
	import PageNumberingBuilder from './PageNumberingBuilder.svelte';

	let { model }: { model: WriteANovelState } = $props();
	const project = untrack(() => model.workspace!.project);
	const documents = untrack(() => model.workspace!.documents);
	let title = $state(project.title);
	let subtitle = $state(project.subtitle);
	let author = $state(project.author);
	let synopsis = $state(project.synopsis);
	let trimSize = $state<TrimSize>(project.trimSize);
	let typography = $state<TypographyPreset>(project.typography);
	let frontCoverPosition = $state<CoverPosition>(project.frontCoverPosition ?? 'center');
	let backCoverPosition = $state<CoverPosition>(project.backCoverPosition ?? 'center');
	let chapterHeading = $state<ChapterHeadingSettings>({ ...bookChapterHeading(project) });
	let pageNumbering = $state<PageNumberingSettings>({ ...bookPageNumbering(project, documents)! });
	let savingCover = $state<'front' | 'back'>();
	const coverPositions: { value: CoverPosition; label: string }[] = [
		{ value: 'top-left', label: 'Top left' },
		{ value: 'top-center', label: 'Top center' },
		{ value: 'top-right', label: 'Top right' },
		{ value: 'center-left', label: 'Center left' },
		{ value: 'center', label: 'Center' },
		{ value: 'center-right', label: 'Center right' },
		{ value: 'bottom-left', label: 'Bottom left' },
		{ value: 'bottom-center', label: 'Bottom center' },
		{ value: 'bottom-right', label: 'Bottom right' }
	];
	const coverObjectPositions: Record<CoverPosition, string> = {
		'top-left': 'left top',
		'top-center': 'center top',
		'top-right': 'right top',
		'center-left': 'left center',
		center: 'center center',
		'center-right': 'right center',
		'bottom-left': 'left bottom',
		'bottom-center': 'center bottom',
		'bottom-right': 'right bottom'
	};
	const trimAspectRatios: Record<TrimSize, string> = {
		'trade-6x9': '2 / 3',
		a5: '148 / 210',
		letter: '8.5 / 11'
	};

	function coverPosition(side: 'front' | 'back'): CoverPosition {
		return side === 'front' ? frontCoverPosition : backCoverPosition;
	}

	function setCoverPosition(side: 'front' | 'back', position: CoverPosition): void {
		if (side === 'front') frontCoverPosition = position;
		else backCoverPosition = position;
	}

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
		await model.updateBookSettings({
			title,
			subtitle,
			author,
			synopsis,
			trimSize,
			typography,
			frontCoverPosition,
			backCoverPosition,
			chapterHeading: { ...chapterHeading },
			pageNumbering: { ...pageNumbering }
		});
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
	description="Covers, book details, and page design"
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
					<span>Book size</span>
					<select bind:value={trimSize}>
						<option value="trade-6x9">Paperback — 6 × 9 in</option>
						<option value="a5">Compact — 148 × 210 mm</option>
						<option value="letter">Large — 8.5 × 11 in</option>
					</select>
				</label>
				<label class="field">
					<span>Reading style</span>
					<select bind:value={typography}>
						<option value="literary">Literary — warm and bookish</option>
						<option value="classic">Classic — timeless and traditional</option>
						<option value="modern">Modern — simple and clean</option>
					</select>
				</label>
			</div>
			<div class="heading-settings">
				<div>
					<h3>Chapter headings</h3>
					<p>Used for every chapter unless you choose something different for one.</p>
				</div>
				<ChapterHeadingBuilder
					value={chapterHeading}
					chapterNumber={1}
					chapterTitle="The Lantern Room"
					onChange={(value) => (chapterHeading = value)}
				/>
			</div>
		</section>

		<section class="covers">
			<h3>Front and back cover</h3>
			<p class="muted">Covers fill the entire PDF page. Choose where any cropping happens.</p>
			<div class="cover-pair">
				{#each ['front', 'back'] as side (side)}
					{@const coverSide = side === 'front' ? 'front' : 'back'}
					<div class="cover-card">
						<div class="cover-preview" style:aspect-ratio={trimAspectRatios[trimSize]}>
							{#if coverUrl(coverSide)}
								<img
									src={coverUrl(coverSide)}
									alt={`${coverSide} cover`}
									style:object-position={coverObjectPositions[coverPosition(coverSide)]}
								/>
							{:else}
								<BookImage size={34} /><span>No {coverSide} cover</span>
							{/if}
						</div>
						<strong>{coverSide === 'front' ? 'Front cover' : 'Back cover'}</strong>
						{#if coverUrl(coverSide)}
							<label class="cover-position">
								<span>{coverSide === 'front' ? 'Front' : 'Back'} cover crop position</span>
								<select
									value={coverPosition(coverSide)}
									onchange={(event) =>
										setCoverPosition(coverSide, event.currentTarget.value as CoverPosition)}
								>
									{#each coverPositions as position (position.value)}
										<option value={position.value}>{position.label}</option>
									{/each}
								</select>
							</label>
						{/if}
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

	<section class="heading-settings page-numbering-settings">
		<div>
			<h3>Page numbering</h3>
			<p>Choose which book pages are numbered and how each number appears.</p>
		</div>
		<PageNumberingBuilder
			value={pageNumbering}
			{documents}
			onChange={(value) => (pageNumbering = value)}
		/>
	</section>
	<button class="button button-primary save" type="button" onclick={save}>Save book settings</button
	>

	<div class="danger-zone">
		<div>
			<strong>Delete this novel</strong><span
				>Removes the novel, its writing, notes, and pictures.</span
			>
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

	.heading-settings {
		display: grid;
		gap: 0.8rem;
		margin-top: 0.4rem;
		padding-top: 1.15rem;
		border-top: 1px solid var(--line);
	}

	.heading-settings h3 {
		margin-bottom: 0.25rem;
	}

	.heading-settings p {
		margin: 0;
		color: var(--ink-soft);
		font-size: 0.74rem;
	}

	.page-numbering-settings {
		margin-top: 1.6rem;
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
		object-fit: cover;
	}

	.cover-preview span {
		margin-top: -1.5rem;
	}

	.cover-position {
		display: grid;
		gap: 0.3rem;
		text-align: left;
	}

	.cover-position span {
		color: var(--ink-soft);
		font-size: 0.68rem;
	}

	.cover-position select {
		width: 100%;
		min-width: 0;
		padding: 0.45rem 0.5rem;
		font-size: 0.72rem;
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
