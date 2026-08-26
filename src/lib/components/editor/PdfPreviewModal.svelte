<script lang="ts">
	import { Download, ExternalLink, LoaderCircle } from '@lucide/svelte';
	import type { PdfPreview } from '$lib/export/pdf-preview';
	import { downloadBlob } from '$lib/export/download';
	import Modal from '$lib/components/ui/Modal.svelte';

	type Props = {
		preview?: PdfPreview;
		url?: string;
		loading: boolean;
		onClose: () => void;
	};

	let { preview, url, loading, onClose }: Props = $props();
	const description = $derived(
		loading
			? 'Rendering the same PDF produced by export…'
			: preview
				? `Page ${preview.page} of ${preview.totalPages}${preview.matched ? ' — aligned to the text in view' : ''}`
				: undefined
	);
	const previewSource = $derived.by(() => {
		if (!url || !preview) return undefined;
		const parameters = new URLSearchParams({
			page: String(preview.page),
			zoom: 'page-width'
		});
		if (preview.pageTop !== undefined)
			parameters.set('view', `FitH,${Math.round(preview.pageTop)}`);
		return `${url}#${parameters}`;
	});

	function openPreview(): void {
		if (previewSource) window.open(previewSource, '_blank', 'noopener,noreferrer');
	}

	function downloadPreview(): void {
		if (preview) downloadBlob(preview.blob, preview.fileName);
	}
</script>

{#snippet footer()}
	{#if url && preview}
		<button class="secondary-button" type="button" onclick={openPreview}>
			<ExternalLink size={16} /> Open in new tab
		</button>
		<button class="primary-button" type="button" onclick={downloadPreview}>
			<Download size={16} /> Download PDF
		</button>
	{/if}
{/snippet}

<Modal title="PDF preview" {description} {onClose} {footer} width="preview">
	<div class="preview-frame">
		{#if loading}
			<div class="loading-preview" role="status">
				<span><LoaderCircle size={28} /></span>
				<strong>Typesetting your book…</strong>
				<small>Large books and images may take a moment.</small>
			</div>
		{:else if previewSource}
			<iframe title="Rendered PDF preview" src={previewSource}></iframe>
		{/if}
	</div>
</Modal>

<style>
	.preview-frame,
	iframe {
		width: 100%;
		height: 100%;
	}

	.preview-frame {
		min-height: 24rem;
		background: #4e504d;
	}

	iframe {
		display: block;
		border: 0;
	}

	.loading-preview {
		display: grid;
		height: 100%;
		place-items: center;
		align-content: center;
		gap: 0.5rem;
		color: white;
		text-align: center;
	}

	.loading-preview span {
		display: grid;
		animation: spin 900ms linear infinite;
	}

	.loading-preview small {
		color: rgb(255 255 255 / 72%);
	}

	.secondary-button,
	.primary-button {
		display: inline-flex;
		min-height: 2.35rem;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.8rem;
		border-radius: 0.5rem;
		font-size: 0.75rem;
		font-weight: 750;
	}

	.secondary-button {
		color: var(--forest-deep);
		background: white;
		border: 1px solid var(--line);
	}

	.primary-button {
		color: white;
		background: var(--forest);
		border: 1px solid var(--forest);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 600px) {
		.secondary-button {
			display: none;
		}
	}
</style>
