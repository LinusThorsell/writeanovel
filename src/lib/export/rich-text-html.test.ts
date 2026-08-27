import { describe, expect, it } from 'vitest';
import { richTextToHtml } from './rich-text-html';

describe('rich text HTML export', () => {
	it('exports editable drawings through the same safe asset path as pictures', () => {
		const html = richTextToHtml(
			{
				type: 'doc',
				content: [
					{
						type: 'drawing',
						attrs: {
							assetId: 'drawing-1',
							alt: 'Map of the harbor',
							alignment: 'left',
							width: 420
						}
					}
				]
			},
			(assetId) => `images/${assetId}.svg`
		);

		expect(html).toBe(
			'<figure class="media media-left"><img src="images/drawing-1.svg" alt="Map of the harbor" style="width:420px;max-width:100%;" /></figure>'
		);
	});

	it('continues to ignore unknown nodes while preserving their known children', () => {
		const html = richTextToHtml(
			{
				type: 'doc',
				content: [
					{
						type: 'future-node',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Still readable' }] }]
					}
				]
			},
			() => ''
		);
		expect(html).toBe('<p>Still readable</p>');
	});
});
