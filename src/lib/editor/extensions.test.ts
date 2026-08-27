import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { editorExtensions } from './extensions';

describe('editor extensions', () => {
	it('loads legacy documents without rewriting their existing nodes', () => {
		const body = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Existing prose.' }] },
				{
					type: 'image',
					attrs: {
						src: 'blob:existing',
						alt: 'Existing artwork',
						assetId: 'asset-1',
						alignment: 'right'
					}
				}
			]
		};
		const editor = new Editor({ extensions: editorExtensions('Write…'), content: body });

		const restored = editor.getJSON();
		expect(restored.content?.[0]).toEqual(body.content[0]);
		expect(restored.content?.[1]).toMatchObject(body.content[1]);
		expect(restored.content?.some((node) => node.type === 'drawing')).toBe(false);
		editor.destroy();
	});

	it('keeps editable drawings distinct from uploaded images', () => {
		const editor = new Editor({ extensions: editorExtensions('Write…') });
		editor.commands.insertContent({
			type: 'drawing',
			attrs: {
				src: 'blob:drawing',
				alt: 'Editable drawing',
				assetId: 'drawing-1',
				alignment: 'center',
				width: 420,
				height: 420
			}
		});

		const drawing = editor.getJSON().content?.find((node) => node.type === 'drawing');
		expect(drawing?.attrs).toMatchObject({ assetId: 'drawing-1', width: 420, height: 420 });
		editor.destroy();
	});
});
