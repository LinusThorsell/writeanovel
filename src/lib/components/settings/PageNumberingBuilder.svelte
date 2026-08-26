<script lang="ts">
	import { manuscriptDocuments } from '$lib/domain/ordering';
	import {
		pageNumberAlignment,
		pageNumberDocumentLabel,
		pageNumberText
	} from '$lib/domain/page-numbering';
	import type {
		ManuscriptDocument,
		PageNumberCountMode,
		PageNumberingSettings,
		PageNumberNumeralStyle,
		PageNumberPlacement
	} from '$lib/domain/types';

	type Props = {
		value: PageNumberingSettings;
		documents: ManuscriptDocument[];
		onChange: (value: PageNumberingSettings) => void;
	};

	let { value, documents, onChange }: Props = $props();
	const orderedDocuments = $derived(manuscriptDocuments(documents));
	const startIndex = $derived(
		Math.max(
			0,
			orderedDocuments.findIndex((document) => document.id === value.startDocumentId)
		)
	);
	const previewNumber = $derived(value.countMode === 'restart' ? value.restartAt : startIndex + 1);
	const previewAlignment = $derived(pageNumberAlignment(value.placement, previewNumber));
	const previewText = $derived(pageNumberText(value, previewNumber));

	function toggleEnabled(event: Event): void {
		onChange({ ...value, enabled: (event.currentTarget as HTMLInputElement).checked });
	}

	function updateStart(event: Event): void {
		const startDocumentId = (event.currentTarget as HTMLSelectElement).value;
		const nextStartIndex = orderedDocuments.findIndex(
			(document) => document.id === startDocumentId
		);
		const endIndex = orderedDocuments.findIndex((document) => document.id === value.endDocumentId);
		onChange({
			...value,
			startDocumentId,
			endDocumentId: endIndex < nextStartIndex ? startDocumentId : value.endDocumentId
		});
	}

	function updateEnd(event: Event): void {
		const endDocumentId = (event.currentTarget as HTMLSelectElement).value;
		const nextEndIndex = orderedDocuments.findIndex((document) => document.id === endDocumentId);
		onChange({
			...value,
			startDocumentId: nextEndIndex < startIndex ? endDocumentId : value.startDocumentId,
			endDocumentId
		});
	}

	function updateCountMode(event: Event): void {
		const selected = (event.currentTarget as HTMLSelectElement).value;
		const countMode: PageNumberCountMode = selected === 'continue' ? 'continue' : 'restart';
		onChange({ ...value, countMode });
	}

	function updateRestartAt(event: Event): void {
		const number = (event.currentTarget as HTMLInputElement).valueAsNumber;
		onChange({
			...value,
			restartAt: Number.isFinite(number) ? Math.max(1, Math.trunc(number)) : 1
		});
	}

	function updateNumeralStyle(event: Event): void {
		const selected = (event.currentTarget as HTMLSelectElement).value;
		const numeralStyle: PageNumberNumeralStyle = selected === 'roman' ? 'roman' : 'arabic';
		onChange({ ...value, numeralStyle });
	}

	function updateTemplate(event: Event): void {
		const template = (event.currentTarget as HTMLInputElement).value.replaceAll('#', '{number}');
		onChange({ ...value, template });
	}

	function friendlyTemplate(template: string): string {
		return template.replaceAll('{number}', '#');
	}

	function updatePlacement(event: Event): void {
		const selected = (event.currentTarget as HTMLSelectElement).value;
		const placement: PageNumberPlacement =
			selected === 'bottom-left' ||
			selected === 'bottom-center' ||
			selected === 'bottom-right' ||
			selected === 'bottom-inside'
				? selected
				: 'bottom-outside';
		onChange({ ...value, placement });
	}
</script>

<div class="builder">
	<label class="toggle">
		<input type="checkbox" checked={value.enabled} onchange={toggleEnabled} />
		<span
			><strong>Show page numbers</strong><small>Only within the selected book pages.</small></span
		>
	</label>

	<fieldset disabled={!value.enabled}>
		<div class="controls">
			<div class="two-fields">
				<label class="field">
					<span>Start numbering at</span>
					<select
						aria-label="Start numbering at"
						value={value.startDocumentId}
						onchange={updateStart}
					>
						{#each orderedDocuments as document (document.id)}
							<option value={document.id}>{pageNumberDocumentLabel(documents, document)}</option>
						{/each}
					</select>
				</label>
				<label class="field">
					<span>Stop numbering after</span>
					<select
						aria-label="Stop numbering after"
						value={value.endDocumentId}
						onchange={updateEnd}
					>
						{#each orderedDocuments as document (document.id)}
							<option value={document.id}>{pageNumberDocumentLabel(documents, document)}</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="two-fields sequence-fields">
				<label class="field">
					<span>Where counting begins</span>
					<select
						aria-label="Where page counting begins"
						value={value.countMode}
						onchange={updateCountMode}
					>
						<option value="restart">Restart at a chosen number</option>
						<option value="continue">Count earlier unnumbered pages</option>
					</select>
				</label>
				<label class="field">
					<span>Restart at</span>
					<input
						aria-label="Restart page numbering at"
						type="number"
						min="1"
						step="1"
						value={value.restartAt}
						disabled={value.countMode !== 'restart'}
						oninput={updateRestartAt}
					/>
				</label>
			</div>

			<div class="two-fields">
				<label class="field">
					<span>Number style</span>
					<select
						aria-label="Page number style"
						value={value.numeralStyle}
						onchange={updateNumeralStyle}
					>
						<option value="arabic">1, 2, 3</option>
						<option value="roman">i, ii, iii</option>
					</select>
				</label>
				<label class="field">
					<span>Position</span>
					<select
						aria-label="Page number position"
						value={value.placement}
						onchange={updatePlacement}
					>
						<option value="bottom-left">Bottom left</option>
						<option value="bottom-center">Bottom center</option>
						<option value="bottom-right">Bottom right</option>
						<option value="bottom-inside">Bottom inside</option>
						<option value="bottom-outside">Bottom outside</option>
					</select>
				</label>
			</div>

			<label class="field">
				<span>How page numbers look</span>
				<input
					aria-label="How page numbers look"
					value={friendlyTemplate(value.template)}
					oninput={updateTemplate}
				/>
				<small>Use # where the number should appear, such as “Page #”.</small>
			</label>
		</div>

		<div class="preview" aria-label="Page number example">
			<span>Example</span>
			<div class="page">
				<div class={['folio', previewAlignment]}>{previewText}</div>
			</div>
		</div>
	</fieldset>
</div>

<style>
	.builder,
	.controls {
		display: grid;
		gap: 0.8rem;
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

	fieldset {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(10rem, 0.65fr);
		gap: 1rem;
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}

	fieldset:disabled {
		opacity: 0.62;
	}

	.two-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem;
	}

	.sequence-fields {
		grid-template-columns: minmax(0, 1.5fr) minmax(6rem, 0.5fr);
	}

	.field {
		display: grid;
		min-width: 0;
		gap: 0.35rem;
		font-size: 0.76rem;
		font-weight: 700;
	}

	.field input,
	.field select {
		width: 100%;
		min-width: 0;
		padding: 0.55rem 0.65rem;
		color: var(--ink);
		background: white;
		border: 1px solid var(--line);
		border-radius: 0.45rem;
	}

	.preview {
		min-height: 12rem;
		padding: 0.8rem;
		background: #f1ede5;
		border: 1px solid var(--line);
		border-radius: 0.55rem;
	}

	.preview > span {
		display: block;
		margin-bottom: 0.65rem;
		color: var(--ink-soft);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.page {
		display: grid;
		height: 9rem;
		align-items: end;
		padding: 0.65rem 0.8rem;
		background: #fffefb;
		box-shadow: 0 0.25rem 0.8rem rgb(35 42 38 / 10%);
	}

	.folio {
		color: #3f4843;
		font-family: 'Manrope Variable', sans-serif;
		font-size: 0.72rem;
	}

	.folio.left {
		text-align: left;
	}

	.folio.center {
		text-align: center;
	}

	.folio.right {
		text-align: right;
	}

	@media (max-width: 640px) {
		fieldset,
		.two-fields,
		.sequence-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
