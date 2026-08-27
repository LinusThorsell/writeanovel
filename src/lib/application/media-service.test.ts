import { describe, expect, it } from 'vitest';
import {
	createDrawingAsset,
	createMediaAsset,
	hydrateAssetSources,
	removeTransientAssetSources,
	updateDrawingAsset
} from './media-service';
import { createEmptyDrawing } from '$lib/domain/drawing';

describe('media service', () => {
	it('creates and updates editable SVG drawings without changing their identity', async () => {
		const drawing = createEmptyDrawing();
		const asset = createDrawingAsset('project-1', drawing);
		drawing.elements.push({
			id: 'line-1',
			type: 'line',
			stroke: '#000000',
			strokeWidth: 8,
			x1: 10,
			y1: 20,
			x2: 100,
			y2: 120
		});
		const updated = updateDrawingAsset(asset, drawing);

		expect(asset.mimeType).toBe('image/svg+xml');
		expect(asset.drawing?.elements).toHaveLength(0);
		expect(updated.id).toBe(asset.id);
		expect(updated.createdAt).toBe(asset.createdAt);
		expect(updated.drawing?.elements).toHaveLength(1);
		expect(await updated.bytes.text()).toContain('<line');
	});

	it('accepts safe SVG artwork and keeps it as a separate asset', async () => {
		const file = new File(
			[
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
			],
			'ornament.svg',
			{ type: 'image/svg+xml' }
		);

		const asset = await createMediaAsset('project-1', file);
		expect(asset.projectId).toBe('project-1');
		expect(asset.mimeType).toBe('image/svg+xml');
		expect(asset.bytes).toBe(file);
	});

	it('rejects executable SVG content', async () => {
		const file = new File(
			['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
			'unsafe.svg',
			{ type: 'image/svg+xml' }
		);

		await expect(createMediaAsset('project-1', file)).rejects.toThrow('cannot use');
	});

	it('hydrates object URLs for editing and strips them before persistence', () => {
		const stored = {
			type: 'doc',
			content: [
				{ type: 'image', attrs: { assetId: 'asset-1', src: '' } },
				{ type: 'drawing', attrs: { assetId: 'drawing-1', src: '' } }
			]
		};
		const hydrated = hydrateAssetSources(
			stored,
			new Map([
				['asset-1', 'blob:preview'],
				['drawing-1', 'blob:drawing']
			])
		);
		expect(hydrated.content?.[0].attrs?.src).toBe('blob:preview');
		expect(hydrated.content?.[1].attrs?.src).toBe('blob:drawing');
		const persisted = removeTransientAssetSources(hydrated);
		expect(persisted.content?.[0].attrs?.src).toBe('');
		expect(persisted.content?.[1].attrs?.src).toBe('');
	});
});
