import { type Extensions } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import StarterKit from '@tiptap/starter-kit';
import { CommentAnchor } from './comment-anchor';

export const AssetImage = Image.extend({
	parseHTML() {
		return [
			{
				tag: this.options.allowBase64
					? 'img[src]:not([data-drawing-asset-id])'
					: 'img[src]:not([src^="data:"]):not([data-drawing-asset-id])'
			}
		];
	},
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

export const DrawingImage = Image.extend({
	name: 'drawing',
	parseHTML() {
		return [{ tag: 'img[data-drawing-asset-id]' }];
	},
	addAttributes() {
		return {
			...this.parent?.(),
			assetId: {
				default: null,
				parseHTML: (element: HTMLElement) => element.dataset.drawingAssetId ?? null,
				renderHTML: (attributes: { assetId?: string }) =>
					attributes.assetId ? { 'data-drawing-asset-id': attributes.assetId } : {}
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
		Typography,
		CommentAnchor,
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
		}),
		DrawingImage.configure({
			allowBase64: false,
			resize: {
				enabled: true,
				directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
				minWidth: 120,
				minHeight: 120,
				alwaysPreserveAspectRatio: true
			}
		})
	];
}
