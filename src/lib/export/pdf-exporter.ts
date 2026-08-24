import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type {
	Alignment,
	Content,
	ContentImage,
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
	TrimSize,
	TypographyPreset,
	WorkspaceSnapshot
} from '$lib/domain/types';
import { blobToDataUrl } from '$lib/application/media-service';
import { safeFileName } from './download';

type PreparedPdfAsset = { kind: 'image'; source: string } | { kind: 'svg'; source: string };

type PdfContext = {
	assets: ReadonlyMap<string, PreparedPdfAsset>;
	contentWidth: number;
};

const pageSizes: Record<TrimSize, { width: number; height: number }> = {
	'trade-6x9': { width: 432, height: 648 },
	a5: { width: 419.53, height: 595.28 },
	letter: { width: 612, height: 792 }
};

const fontNames: Record<TypographyPreset, string> = {
	literary: 'Literary',
	classic: 'Literary',
	modern: 'Manrope'
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
		requestedWidth ? requestedWidth * 0.75 : context.contentWidth
	);
	const alignment = alignmentAttribute(node.attrs?.alignment) ?? 'center';

	if (asset.kind === 'svg') {
		const content: ContentSvg = { svg: asset.source, width, alignment, margin: [0, 12, 0, 12] };
		return content;
	}
	const content: ContentImage = {
		image: asset.source,
		width,
		alignment,
		margin: [0, 12, 0, 12]
	};
	return content;
}

function listItemContent(node: RichTextNode, context: PdfContext): Content {
	const converted = blockContent(node, context);
	return converted.length === 1 ? converted[0] : { stack: converted };
}

function blockContent(node: RichTextNode, context: PdfContext): Content[] {
	const alignment = alignmentAttribute(node.attrs?.textAlign);

	switch (node.type) {
		case 'doc':
			return (node.content ?? []).flatMap((child) => blockContent(child, context));
		case 'paragraph':
			return [{ text: inlineContent(node), alignment, margin: [0, 0, 0, 7] }];
		case 'heading': {
			const level = numberAttribute(node.attrs?.level) ?? 2;
			return [
				{
					text: inlineContent(node),
					style: level === 1 ? 'headingOne' : level === 2 ? 'headingTwo' : 'headingThree',
					alignment,
					margin: [0, 12, 0, 8]
				}
			];
		}
		case 'blockquote':
			return [
				{
					stack: (node.content ?? []).flatMap((child) => blockContent(child, context)),
					italics: true,
					margin: [20, 10, 20, 10],
					color: '#3f4843'
				}
			];
		case 'bulletList':
			return [
				{
					ul: (node.content ?? []).map((child) => listItemContent(child, context)),
					margin: [14, 4, 0, 8]
				}
			];
		case 'orderedList':
			return [
				{
					ol: (node.content ?? []).map((child) => listItemContent(child, context)),
					margin: [14, 4, 0, 8]
				}
			];
		case 'listItem':
			return (node.content ?? []).flatMap((child) => blockContent(child, context));
		case 'horizontalRule':
			return [{ text: '•  •  •', alignment: 'center', margin: [0, 12, 0, 12] }];
		case 'image': {
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
	pageWidth: number,
	pageHeight: number
): ContentImage | ContentSvg {
	const fit: [number, number] = [pageWidth - 36, pageHeight - 36];
	return asset.kind === 'svg'
		? { svg: asset.source, fit, alignment: 'center', margin: [0, 0, 0, 0] }
		: { image: asset.source, fit, alignment: 'center', margin: [0, 0, 0, 0] };
}

export async function buildPdfDefinition(
	workspace: WorkspaceSnapshot
): Promise<TDocumentDefinitions> {
	const pageSize = pageSizes[workspace.project.trimSize];
	const pageMargin = workspace.project.trimSize === 'letter' ? 72 : 50;
	const preparedAssets = await prepareAssets(workspace.assets);
	const context: PdfContext = {
		assets: preparedAssets,
		contentWidth: pageSize.width - pageMargin * 2
	};
	const content: Content[] = [];
	const frontCoverId = workspace.project.frontCoverAssetId;
	const frontCover = frontCoverId ? preparedAssets.get(frontCoverId) : undefined;
	if (frontCover) {
		const cover = coverContent(frontCover, pageSize.width, pageSize.height);
		cover.pageBreak = 'after';
		content.push(cover);
	}

	const documents = [
		...documentsOfKind(workspace.documents, 'front-matter'),
		...documentsOfKind(workspace.documents, 'chapter'),
		...documentsOfKind(workspace.documents, 'back-matter')
	];

	for (const manuscriptDocument of documents) {
		content.push({
			text: manuscriptDocument.title,
			style: 'chapterTitle',
			alignment: 'center',
			pageBreak: content.length > 0 ? 'before' : undefined,
			outline: true,
			outlineText: manuscriptDocument.title,
			margin: [0, 110, 0, 32]
		});
		content.push(...blockContent(manuscriptDocument.body, context));
	}

	const backCoverId = workspace.project.backCoverAssetId;
	const backCover = backCoverId ? preparedAssets.get(backCoverId) : undefined;
	if (backCover) {
		const cover = coverContent(backCover, pageSize.width, pageSize.height);
		cover.pageBreak = 'before';
		content.push(cover);
	}

	return {
		content,
		pageSize,
		pageMargins: [pageMargin, pageMargin, pageMargin, pageMargin],
		defaultStyle: {
			font: fontNames[workspace.project.typography],
			fontSize: workspace.project.typography === 'modern' ? 10.5 : 10,
			lineHeight: workspace.project.typography === 'modern' ? 1.42 : 1.5,
			alignment: 'justify',
			color: '#171a18'
		},
		styles: {
			chapterTitle: { fontSize: 18, bold: false, characterSpacing: 0.7 },
			headingOne: { fontSize: 17, bold: true },
			headingTwo: { fontSize: 14, bold: true },
			headingThree: { fontSize: 11, bold: true, characterSpacing: 0.4 }
		},
		footer: (currentPage, pageCount) => ({
			text: `${currentPage}  /  ${pageCount}`,
			alignment: 'center',
			fontSize: 8,
			color: '#777d79',
			margin: [0, 12, 0, 0]
		}),
		info: {
			title: workspace.project.title,
			author: workspace.project.author,
			subject: workspace.project.synopsis,
			creator: 'WriteABook'
		}
	};
}

export async function exportPdf(workspace: WorkspaceSnapshot): Promise<void> {
	await prepareFonts();
	const definition = await buildPdfDefinition(workspace);
	await pdfMake.createPdf(definition).download(`${safeFileName(workspace.project.title)}.pdf`);
}
