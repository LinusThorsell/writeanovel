import type { DrawingDocument, JsonObject, MediaAsset, RichTextNode } from '$lib/domain/types';
import { drawingToSvgBlob } from '$lib/domain/drawing';

export const ACCEPTED_MEDIA_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/svg+xml'
] as const;

export const MEDIA_ACCEPT_ATTRIBUTE = ACCEPTED_MEDIA_TYPES.join(',');
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

const acceptedTypes = new Set<string>(ACCEPTED_MEDIA_TYPES);
const forbiddenSvgElements = new Set(['script', 'foreignObject', 'iframe', 'object', 'embed']);

function validateSvg(svgText: string): void {
	const document = new DOMParser().parseFromString(svgText, 'image/svg+xml');
	if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg') {
		throw new Error('That picture could not be read. Please choose another one.');
	}

	for (const element of Array.from(document.querySelectorAll('*'))) {
		if (forbiddenSvgElements.has(element.localName)) {
			throw new Error('That picture contains something WriteANovel cannot use.');
		}
		for (const attribute of Array.from(element.attributes)) {
			const value = attribute.value.trim().toLowerCase();
			if (attribute.name.toLowerCase().startsWith('on')) {
				throw new Error('That picture contains something WriteANovel cannot use.');
			}
			if (
				(attribute.localName === 'href' || attribute.localName === 'src') &&
				(value.startsWith('http:') || value.startsWith('https:') || value.startsWith('//'))
			) {
				throw new Error('That picture depends on something outside the book. Choose another one.');
			}
		}
	}
}

export async function createMediaAsset(projectId: string, file: File): Promise<MediaAsset> {
	if (!acceptedTypes.has(file.type)) {
		throw new Error('Choose a supported picture.');
	}
	if (file.size > MAX_MEDIA_BYTES) {
		throw new Error('That picture is too large. Choose one smaller than 20 MB.');
	}
	if (file.type === 'image/svg+xml') validateSvg(await file.text());

	const timestamp = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		projectId,
		name: file.name,
		mimeType: file.type,
		bytes: file,
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

export function createDrawingAsset(projectId: string, drawing: DrawingDocument): MediaAsset {
	const timestamp = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		projectId,
		name: 'Drawing.svg',
		mimeType: 'image/svg+xml',
		bytes: drawingToSvgBlob(drawing),
		drawing: structuredClone(drawing),
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

export function updateDrawingAsset(asset: MediaAsset, drawing: DrawingDocument): MediaAsset {
	if (!asset.drawing) throw new Error('That picture is not an editable drawing.');
	return {
		...asset,
		bytes: drawingToSvgBlob(drawing),
		drawing: structuredClone(drawing),
		updatedAt: new Date().toISOString()
	};
}

export function createAssetUrls(assets: MediaAsset[]): Map<string, string> {
	return new Map(assets.map((asset) => [asset.id, URL.createObjectURL(asset.bytes)]));
}

export function revokeAssetUrls(urls: Map<string, string>): void {
	for (const url of urls.values()) URL.revokeObjectURL(url);
}

function cloneAttributes(attributes: JsonObject | undefined): JsonObject | undefined {
	return attributes ? structuredClone(attributes) : undefined;
}

export function hydrateAssetSources(
	node: RichTextNode,
	assetUrls: ReadonlyMap<string, string>
): RichTextNode {
	const attrs = cloneAttributes(node.attrs);
	const assetId = attrs?.assetId;
	if (typeof assetId === 'string') attrs!.src = assetUrls.get(assetId) ?? '';

	return {
		...node,
		attrs,
		content: node.content?.map((child) => hydrateAssetSources(child, assetUrls))
	};
}

export function removeTransientAssetSources(node: RichTextNode): RichTextNode {
	const attrs = cloneAttributes(node.attrs);
	if (typeof attrs?.assetId === 'string') attrs.src = '';

	return {
		...node,
		attrs,
		content: node.content?.map(removeTransientAssetSources)
	};
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	let binary = '';
	const chunkSize = 16_384;
	for (let index = 0; index < bytes.length; index += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
	}
	return `data:${blob.type};base64,${btoa(binary)}`;
}
