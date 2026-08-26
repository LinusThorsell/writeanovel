import { describe, expect, it } from 'vitest';
import {
	createMediaAsset,
	hydrateAssetSources,
	removeTransientAssetSources
} from './media-service';

describe('media service', () => {
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
			content: [{ type: 'image', attrs: { assetId: 'asset-1', src: '' } }]
		};
		const hydrated = hydrateAssetSources(stored, new Map([['asset-1', 'blob:preview']]));
		expect(hydrated.content?.[0].attrs?.src).toBe('blob:preview');
		expect(removeTransientAssetSources(hydrated).content?.[0].attrs?.src).toBe('');
	});
});
