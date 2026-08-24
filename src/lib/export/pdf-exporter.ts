import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type {
	Alignment,
	Content,
	ContentImage,
	ContentStack,
	ContentSvg,
	ContentText,
	TDocumentDefinitions
} from 'pdfmake/interfaces';
import literaryRegularUrl from '@fontsource/libre-baskerville/files/libre-baskerville-latin-400-normal.woff?url';
import literaryItalicUrl from '@fontsource/libre-baskerville/files/libre-baskerville-latin-400-italic.woff?url';
import literaryBoldUrl from '@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff?url';
import literaryBoldItalicUrl from '@fontsource/libre-baskerville/files/libre-baskerville-latin-700-italic.woff?url';
import manropeUrl from '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url';
import { documentsOfKind } from '$lib/domain/ordering';
import type {
	JsonValue,
	MediaAsset,
	RichTextMark,
	RichTextNode,
	WorkspaceSnapshot
} from '$lib/domain/types';
import { blobToDataUrl } from '$lib/application/media-service';
import {
	BOOK_LAYOUT,
	BOOK_PAGE_METRICS,
	bookTypographyStyle,
	editorContentWidthPx,
	typesetDocumentHeading,
	type BookTypographyStyle
} from '$lib/typesetting/book-style';
import { safeFileName } from './download';

type PreparedPdfAsset = { kind: 'image'; source: string } | { kind: 'svg'; source: string };

type PdfContext = {
	assets: ReadonlyMap<string, PreparedPdfAsset>;
	contentWidth: number;
	editorContentWidth: number;
	typography: BookTypographyStyle;
	previousBlock: 'paragraph' | 'other' | undefined;
};

let fontsReady: Promise<void> | undefined;

function stringAttribute(value: JsonValue | undefined): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function numberAttribute(value: JsonValue | undefined): number | undefined {
	return typeof value === 'number' ? value : undefined;
}

function alignmentAttribute(value: JsonValue | undefined): Alignment | undefined {
	return value === 'left' || value === 'right' || value === 'center' || value === 'justify'
		? value
		: undefined;
}

function applyPdfMarks(span: ContentText, marks: RichTextMark[] = []): ContentText {
	for (const mark of marks) {
		switch (mark.type) {
			case 'bold':
				span.bold = true;
				break;
			case 'italic':
				span.italics = true;
				break;
			case 'underline':
				span.decoration = 'underline';
				break;
			case 'strike':
				span.decoration = 'lineThrough';
				break;
			case 'code':
				span.background = '#eeeae2';
				break;
			case 'link':
				span.link = stringAttribute(mark.attrs?.href);
				span.color = '#315f73';
				break;
		}
	}
	return span;
}

function inlineContent(node: RichTextNode): Content[] {
	return (node.content ?? []).flatMap((child) => {
		if (child.type === 'text') {
			return [applyPdfMarks({ text: child.text ?? '' }, child.marks)];
		}
		if (child.type === 'hardBreak') return [{ text: '\n' }];
		return inlineContent(child);
	});
}

function imageContent(node: RichTextNode, context: PdfContext): Content | undefined {
	const assetId = stringAttribute(node.attrs?.assetId);
	if (!assetId) return undefined;
	const asset = context.assets.get(assetId);
	if (!asset) return undefined;
	const requestedWidth = numberAttribute(node.attrs?.width);
	const width = Math.min(
		context.contentWidth,
		requestedWidth
			? Math.max(1, (requestedWidth / context.editorContentWidth) * context.contentWidth)
			: context.contentWidth
	);
	const alignment = alignmentAttribute(node.attrs?.alignment) ?? 'center';
	const mediaMargin = context.typography.bodyFontSizePt * BOOK_LAYOUT.mediaMarginBlockEm;

	if (asset.kind === 'svg') {
		const content: ContentSvg = {
			svg: asset.source,
			width,
			alignment,
			margin: [0, mediaMargin, 0, mediaMargin]
		};
		return content;
	}
	const content: ContentImage = {
		image: asset.source,
		width,
		alignment,
		margin: [0, mediaMargin, 0, mediaMargin]
	};
	return content;
}

function listItemContent(node: RichTextNode, context: PdfContext): Content {
	const converted = blockContent(node, { ...context, previousBlock: undefined });
	return converted.length === 1 ? converted[0] : { stack: converted };
}

function blockContent(node: RichTextNode, context: PdfContext): Content[] {
	const alignment = alignmentAttribute(node.attrs?.textAlign);
	const bodySize = context.typography.bodyFontSizePt;

	switch (node.type) {
		case 'doc':
			return (node.content ?? []).flatMap((child) => blockContent(child, context));
		case 'paragraph': {
			const leadingIndent =
				context.previousBlock === 'paragraph'
					? bodySize * BOOK_LAYOUT.paragraphIndentEm
					: undefined;
			context.previousBlock = 'paragraph';
			return [
				{
					text: inlineContent(node),
					alignment,
					leadingIndent,
					margin: [0, 0, 0, bodySize * BOOK_LAYOUT.paragraphGapEm]
				}
			];
		}
		case 'heading': {
			const level = numberAttribute(node.attrs?.level) ?? 2;
			context.previousBlock = 'other';
			return [
				{
					text: inlineContent(node),
					style: level === 1 ? 'headingOne' : level === 2 ? 'headingTwo' : 'headingThree',
					alignment,
					margin: [
						0,
						bodySize * BOOK_LAYOUT.headingMarginTopEm,
						0,
						bodySize * BOOK_LAYOUT.headingMarginBottomEm
					]
				}
			];
		}
		case 'blockquote': {
			context.previousBlock = 'other';
			const nestedContext: PdfContext = { ...context, previousBlock: undefined };
			return [
				{
					stack: (node.content ?? []).flatMap((child) => blockContent(child, nestedContext)),
					italics: true,
					margin: [
						bodySize * BOOK_LAYOUT.blockquoteMarginInlineEm,
						bodySize * BOOK_LAYOUT.blockquoteMarginBlockEm,
						bodySize * BOOK_LAYOUT.blockquoteMarginInlineEm,
						bodySize * BOOK_LAYOUT.blockquoteMarginBlockEm
					],
					color: '#3f4843'
				}
			];
		}
		case 'bulletList':
			context.previousBlock = 'other';
			return [
				{
					ul: (node.content ?? []).map((child) => listItemContent(child, context)),
					margin: [14, 4, 0, 8]
				}
			];
		case 'orderedList':
			context.previousBlock = 'other';
			return [
				{
					ol: (node.content ?? []).map((child) => listItemContent(child, context)),
					margin: [14, 4, 0, 8]
				}
			];
		case 'listItem':
			return (node.content ?? []).flatMap((child) => blockContent(child, context));
		case 'horizontalRule':
			context.previousBlock = 'other';
			return [{ text: '•  •  •', alignment: 'center', margin: [0, 12, 0, 12] }];
		case 'image': {
			context.previousBlock = 'other';
			const image = imageContent(node, context);
			return image ? [image] : [];
		}
		case 'text':
			return [applyPdfMarks({ text: node.text ?? '' }, node.marks)];
		default:
			return (node.content ?? []).flatMap((child) => blockContent(child, context));
	}
}

async function rasterToPngDataUrl(asset: MediaAsset): Promise<string> {
	if (asset.mimeType === 'image/jpeg' || asset.mimeType === 'image/png') {
		return blobToDataUrl(asset.bytes);
	}

	const bitmap = await createImageBitmap(asset.bytes);
	const canvas = document.createElement('canvas');
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('This browser cannot prepare the image for PDF export.');
	context.drawImage(bitmap, 0, 0);
	bitmap.close();
	return canvas.toDataURL('image/png');
}

async function prepareAssets(assets: MediaAsset[]): Promise<Map<string, PreparedPdfAsset>> {
	const prepared = await Promise.all(
		assets.map(async (asset): Promise<[string, PreparedPdfAsset]> => {
			if (asset.mimeType === 'image/svg+xml') {
				return [asset.id, { kind: 'svg', source: await asset.bytes.text() }];
			}
			return [asset.id, { kind: 'image', source: await rasterToPngDataUrl(asset) }];
		})
	);
	return new Map(prepared);
}

async function fontBase64(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) throw new Error('The bundled book font could not be loaded.');
	const dataUrl = await blobToDataUrl(await response.blob());
	return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

async function prepareFonts(): Promise<void> {
	if (fontsReady) return fontsReady;
	fontsReady = (async () => {
		pdfMake.addVirtualFileSystem(pdfFonts);
		const [regular, italic, bold, boldItalic, manrope] = await Promise.all([
			fontBase64(literaryRegularUrl),
			fontBase64(literaryItalicUrl),
			fontBase64(literaryBoldUrl),
			fontBase64(literaryBoldItalicUrl),
			fontBase64(manropeUrl)
		]);
		pdfMake.addVirtualFileSystem({
			'LibreBaskerville-Regular.woff': regular,
			'LibreBaskerville-Italic.woff': italic,
			'LibreBaskerville-Bold.woff': bold,
			'LibreBaskerville-BoldItalic.woff': boldItalic,
			'Manrope.woff2': manrope
		});
		pdfMake.addFonts({
			Literary: {
				normal: 'LibreBaskerville-Regular.woff',
				bold: 'LibreBaskerville-Bold.woff',
				italics: 'LibreBaskerville-Italic.woff',
				bolditalics: 'LibreBaskerville-BoldItalic.woff'
			},
			Manrope: {
				normal: 'Manrope.woff2',
				bold: 'Manrope.woff2',
				italics: 'Manrope.woff2',
				bolditalics: 'Manrope.woff2'
			}
		});
	})();
	return fontsReady;
}

function coverContent(
	asset: PreparedPdfAsset,
	contentWidth: number,
	contentHeight: number
): ContentImage | ContentSvg {
	const fit: [number, number] = [contentWidth, contentHeight];
	return asset.kind === 'svg'
		? { svg: asset.source, fit, alignment: 'center', margin: [0, 0, 0, 0] }
		: { image: asset.source, fit, alignment: 'center', margin: [0, 0, 0, 0] };
}

function manuscriptHeadingContent(
	workspace: WorkspaceSnapshot,
	document: WorkspaceSnapshot['documents'][number],
	typography: BookTypographyStyle,
	pageBreak: 'before' | undefined
): ContentStack {
	const heading = typesetDocumentHeading(workspace.project, workspace.documents, document);
	const page = BOOK_PAGE_METRICS[workspace.project.trimSize];
	const stack: Content[] = [];
	if (heading.label) {
		stack.push({
			text: heading.label.toLocaleUpperCase(),
			style: 'documentLabel',
			alignment: 'center'
		});
	}
	if (heading.title) {
		stack.push({
			text: heading.title,
			style: 'documentTitle',
			alignment: 'center',
			outline: true,
			outlineText: heading.title
		});
	}

	return {
		stack,
		pageBreak,
		unbreakable: true,
		margin: [
			0,
			stack.length > 0
				? Math.max(0, page.height * BOOK_LAYOUT.documentHeadingTopRatio - page.marginBlock)
				: 0,
			0,
			stack.length > 0 ? typography.bodyFontSizePt * BOOK_LAYOUT.documentHeadingGapEm : 0
		]
	};
}

export async function buildPdfDefinition(
	workspace: WorkspaceSnapshot
): Promise<TDocumentDefinitions> {
	const page = BOOK_PAGE_METRICS[workspace.project.trimSize];
	const typography = bookTypographyStyle(workspace.project.typography);
	const pageSize = { width: page.width, height: page.height };
	const preparedAssets = await prepareAssets(workspace.assets);
	const contentWidth = page.width - page.marginInline * 2;
	const contentHeight = page.height - page.marginBlock * 2;
	const content: Content[] = [];
	const frontCoverId = workspace.project.frontCoverAssetId;
	const frontCover = frontCoverId ? preparedAssets.get(frontCoverId) : undefined;
	if (frontCover) {
		content.push(coverContent(frontCover, contentWidth, contentHeight));
	}

	const documents = [
		...documentsOfKind(workspace.documents, 'front-matter'),
		...documentsOfKind(workspace.documents, 'chapter'),
		...documentsOfKind(workspace.documents, 'back-matter')
	];

	for (const manuscriptDocument of documents) {
		content.push(
			manuscriptHeadingContent(
				workspace,
				manuscriptDocument,
				typography,
				content.length > 0 ? 'before' : undefined
			)
		);
		content.push(
			...blockContent(manuscriptDocument.body, {
				assets: preparedAssets,
				contentWidth,
				editorContentWidth: editorContentWidthPx(workspace.project.trimSize),
				typography,
				previousBlock: undefined
			})
		);
	}

	const backCoverId = workspace.project.backCoverAssetId;
	const backCover = backCoverId ? preparedAssets.get(backCoverId) : undefined;
	if (backCover) {
		const cover = coverContent(backCover, contentWidth, contentHeight);
		cover.pageBreak = 'before';
		content.push(cover);
	}

	return {
		content,
		pageSize,
		pageMargins: [page.marginInline, page.marginBlock, page.marginInline, page.marginBlock],
		defaultStyle: {
			font: typography.pdfFont,
			fontSize: typography.bodyFontSizePt,
			lineHeight: typography.lineHeight,
			alignment: 'left',
			color: '#171a18'
		},
		styles: {
			documentLabel: {
				fontSize: typography.bodyFontSizePt * typography.documentLabelScale,
				bold: true,
				characterSpacing: typography.bodyFontSizePt * BOOK_LAYOUT.documentLabelLetterSpacingEm,
				lineHeight: BOOK_LAYOUT.headingLineHeight,
				margin: [0, 0, 0, typography.bodyFontSizePt * BOOK_LAYOUT.documentLabelGapEm]
			},
			documentTitle: {
				fontSize: typography.bodyFontSizePt * typography.documentTitleScale,
				bold: false,
				characterSpacing: typography.bodyFontSizePt * BOOK_LAYOUT.documentTitleLetterSpacingEm,
				lineHeight: BOOK_LAYOUT.headingLineHeight
			},
			headingOne: {
				fontSize: typography.bodyFontSizePt * typography.headingOneScale,
				bold: true,
				lineHeight: BOOK_LAYOUT.headingLineHeight
			},
			headingTwo: {
				fontSize: typography.bodyFontSizePt * typography.headingTwoScale,
				bold: true,
				lineHeight: BOOK_LAYOUT.headingLineHeight
			},
			headingThree: {
				fontSize: typography.bodyFontSizePt * typography.headingThreeScale,
				bold: true,
				lineHeight: BOOK_LAYOUT.headingLineHeight
			}
		},
		footer: (currentPage, pageCount) => ({
			text:
				(frontCover && currentPage === 1) || (backCover && currentPage === pageCount)
					? ''
					: `Page ${currentPage}`,
			alignment: 'right',
			font: 'Manrope',
			fontSize: 7,
			color: '#777d79',
			margin: [page.marginInline, 12, page.marginInline, 0]
		}),
		info: {
			title: workspace.project.title,
			author: workspace.project.author,
			subject: workspace.project.synopsis,
			creator: 'WriteANovel'
		}
	};
}

export async function exportPdf(workspace: WorkspaceSnapshot): Promise<void> {
	await prepareFonts();
	const definition = await buildPdfDefinition(workspace);
	await pdfMake.createPdf(definition).download(`${safeFileName(workspace.project.title)}.pdf`);
}
