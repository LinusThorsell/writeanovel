import { type Extensions } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import StarterKit from '@tiptap/starter-kit';

export const AssetImage = Image.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			assetId: {
				default: null,
				parseHTML: (element: HTMLElement) => element.dataset.assetId ?? null,
				renderHTML: (attributes: { assetId?: string }) =>
					attributes.assetId ? { 'data-asset-id': attributes.assetId } : {}
			},
			alignment: {
				default: 'center',
				parseHTML: (element: HTMLElement) => element.dataset.alignment ?? 'center',
				renderHTML: (attributes: { alignment?: string }) => ({
					'data-alignment': attributes.alignment ?? 'center'
				})
			}
		};
	}
});

export function editorExtensions(placeholder: string): Extensions {
	return [
		StarterKit.configure({
			heading: { levels: [1, 2, 3] },
			link: {
				openOnClick: false,
				autolink: true,
				linkOnPaste: true,
				HTMLAttributes: { rel: 'noopener noreferrer' }
			}
		}),
		TextAlign.configure({ types: ['heading', 'paragraph'] }),
		Typography,
		Placeholder.configure({ placeholder }),
		AssetImage.configure({
			allowBase64: false,
			resize: {
				enabled: true,
				directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
				minWidth: 80,
				minHeight: 60,
				alwaysPreserveAspectRatio: true
			}
		})
	];
}
