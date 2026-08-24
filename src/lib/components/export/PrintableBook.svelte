<script lang="ts">
	import { documentsOfKind } from '$lib/domain/ordering';
	import type { Attachment } from 'svelte/attachments';
	import type { WorkspaceSnapshot } from '$lib/domain/types';
	import {
		BOOK_LAYOUT,
		BOOK_PAGE_METRICS,
		bookTypographyStyle,
		typesetDocumentHeading
	} from '$lib/typesetting/book-style';
	import PrintRichText from './PrintRichText.svelte';
	import '$lib/export/print-book.css';

	type Props = {
		workspace: WorkspaceSnapshot;
		assetUrls: ReadonlyMap<string, string>;
		onElement: (element: HTMLElement | undefined) => void;
	};

	let { workspace, assetUrls, onElement }: Props = $props();
	const project = $derived(workspace.project);
	const page = $derived(BOOK_PAGE_METRICS[project.trimSize]);
	const typography = $derived(bookTypographyStyle(project.typography));
	const documents = $derived([
		...documentsOfKind(workspace.documents, 'front-matter'),
		...documentsOfKind(workspace.documents, 'chapter'),
		...documentsOfKind(workspace.documents, 'back-matter')
	]);
	const frontCoverUrl = $derived(
		project.frontCoverAssetId ? assetUrls.get(project.frontCoverAssetId) : undefined
	);
	const backCoverUrl = $derived(
		project.backCoverAssetId ? assetUrls.get(project.backCoverAssetId) : undefined
	);

	const captureElement: Attachment<HTMLElement> = (element) => {
		onElement(element);
		return () => onElement(undefined);
	};
</script>

<section
	{@attach captureElement}
	class={['print-book', project.trimSize, project.typography]}
	aria-label="Printable book"
	style:--book-font-family={typography.editorFontFamily}
	style:--book-font-size={`${typography.bodyFontSizePt}pt`}
	style:--book-line-height={String(typography.lineHeight)}
	style:--document-title-scale={String(typography.documentTitleScale)}
	style:--document-label-scale={String(typography.documentLabelScale)}
	style:--heading-one-scale={String(typography.headingOneScale)}
	style:--heading-two-scale={String(typography.headingTwoScale)}
	style:--heading-three-scale={String(typography.headingThreeScale)}
	style:--page-width={`${page.width}pt`}
	style:--page-height={`${page.height}pt`}
	style:--page-content-height={`${page.height - page.marginBlock * 2}pt`}
	style:--document-heading-offset={`${Math.max(0, page.height * BOOK_LAYOUT.documentHeadingTopRatio - page.marginBlock)}pt`}
	style:--document-heading-gap={`${BOOK_LAYOUT.documentHeadingGapEm}em`}
	style:--document-title-letter-spacing={`${BOOK_LAYOUT.documentTitleLetterSpacingEm}em`}
	style:--document-label-letter-spacing={`${BOOK_LAYOUT.documentLabelLetterSpacingEm}em`}
	style:--document-label-gap={`${BOOK_LAYOUT.documentLabelGapEm}em`}
	style:--heading-line-height={String(BOOK_LAYOUT.headingLineHeight)}
	style:--paragraph-gap={`${BOOK_LAYOUT.paragraphGapEm}em`}
	style:--paragraph-indent={`${BOOK_LAYOUT.paragraphIndentEm}em`}
	style:--heading-margin-top={`${BOOK_LAYOUT.headingMarginTopEm}em`}
	style:--heading-margin-bottom={`${BOOK_LAYOUT.headingMarginBottomEm}em`}
	style:--blockquote-margin-block={`${BOOK_LAYOUT.blockquoteMarginBlockEm}em`}
	style:--blockquote-margin-inline={`${BOOK_LAYOUT.blockquoteMarginInlineEm}em`}
	style:--media-margin-block={`${BOOK_LAYOUT.mediaMarginBlockEm}em`}
>
	{#if frontCoverUrl}
		<section class="cover-page front-cover">
			<img src={frontCoverUrl} alt="Front cover" />
		</section>
	{/if}

	{#each documents as document (document.id)}
		{@const heading = typesetDocumentHeading(project, workspace.documents, document)}
		<article class="manuscript-document" data-document-id={document.id}>
			{#if heading.label || heading.title}
				<header class="document-heading">
					{#if heading.label}<p>{heading.label}</p>{/if}
					{#if heading.title}<h1>{heading.title}</h1>{/if}
				</header>
			{/if}
			<div class="manuscript-body">
				<PrintRichText node={document.body} {assetUrls} trimSize={project.trimSize} />
			</div>
		</article>
	{/each}

	{#if backCoverUrl}
		<section class="cover-page back-cover">
			<img src={backCoverUrl} alt="Back cover" />
		</section>
	{/if}
</section>
