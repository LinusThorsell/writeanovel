import type { JsonValue, RichTextMark, RichTextNode } from '$lib/domain/types';

type AssetPathResolver = (assetId: string) => string;

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

function stringAttribute(value: JsonValue | undefined): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function numberAttribute(value: JsonValue | undefined): number | undefined {
	return typeof value === 'number' ? value : undefined;
}

function applyMarks(text: string, marks: RichTextMark[] = []): string {
	return marks.reduce((result, mark) => {
		switch (mark.type) {
			case 'bold':
				return `<strong>${result}</strong>`;
			case 'italic':
				return `<em>${result}</em>`;
			case 'underline':
				return `<u>${result}</u>`;
			case 'strike':
				return `<s>${result}</s>`;
			case 'code':
				return `<code>${result}</code>`;
			case 'link': {
				const href = stringAttribute(mark.attrs?.href) ?? '#';
				return `<a href="${escapeHtml(href)}">${result}</a>`;
			}
			default:
				return result;
		}
	}, escapeHtml(text));
}

function childrenToHtml(node: RichTextNode, assetPath: AssetPathResolver): string {
	return node.content?.map((child) => nodeToHtml(child, assetPath)).join('') ?? '';
}

function nodeToHtml(node: RichTextNode, assetPath: AssetPathResolver): string {
	if (node.type === 'text') return applyMarks(node.text ?? '', node.marks);

	const children = childrenToHtml(node, assetPath);
	const align = stringAttribute(node.attrs?.textAlign);
	const style = align ? ` style="text-align:${escapeHtml(align)}"` : '';

	switch (node.type) {
		case 'doc':
			return children;
		case 'paragraph':
			return `<p${style}>${children || '&#160;'}</p>`;
		case 'heading': {
			const level = Math.min(3, Math.max(1, numberAttribute(node.attrs?.level) ?? 2));
			return `<h${level}${style}>${children}</h${level}>`;
		}
		case 'blockquote':
			return `<blockquote>${children}</blockquote>`;
		case 'bulletList':
			return `<ul>${children}</ul>`;
		case 'orderedList':
			return `<ol>${children}</ol>`;
		case 'listItem':
			return `<li>${children}</li>`;
		case 'hardBreak':
			return '<br />';
		case 'horizontalRule':
			return '<hr />';
		case 'image': {
			const assetId = stringAttribute(node.attrs?.assetId);
			if (!assetId) return '';
			const alt = stringAttribute(node.attrs?.alt) ?? '';
			const width = numberAttribute(node.attrs?.width);
			const alignment = stringAttribute(node.attrs?.alignment) ?? 'center';
			const widthStyle = width ? `width:${width}px;max-width:100%;` : 'max-width:100%;';
			return `<figure class="media media-${escapeHtml(alignment)}"><img src="${escapeHtml(assetPath(assetId))}" alt="${escapeHtml(alt)}" style="${widthStyle}" /></figure>`;
		}
		default:
			return children;
	}
}

export function richTextToHtml(node: RichTextNode, assetPath: AssetPathResolver): string {
	return nodeToHtml(node, assetPath);
}

export function richTextToPlainText(node: RichTextNode): string {
	if (node.type === 'text') return node.text ?? '';
	const separator = ['paragraph', 'heading', 'listItem', 'blockquote'].includes(node.type ?? '')
		? '\n'
		: '';
	return `${node.content?.map(richTextToPlainText).join('') ?? ''}${separator}`;
}
