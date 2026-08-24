import JSZip from 'jszip';
import { documentsOfKind } from '$lib/domain/ordering';
import type { ManuscriptDocument, MediaAsset, WorkspaceSnapshot } from '$lib/domain/types';
import { downloadBlob, safeFileName } from './download';
import { richTextToHtml } from './rich-text-html';
import { typesetDocumentHeading, type TypesetDocumentHeading } from '$lib/typesetting/book-style';

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function extensionFor(asset: MediaAsset): string {
	switch (asset.mimeType) {
		case 'image/jpeg':
			return 'jpg';
		case 'image/svg+xml':
			return 'svg';
		case 'image/webp':
			return 'webp';
		case 'image/gif':
			return 'gif';
		default:
			return 'png';
	}
}

function orderedDocuments(workspace: WorkspaceSnapshot): ManuscriptDocument[] {
	return [
		...documentsOfKind(workspace.documents, 'front-matter'),
		...documentsOfKind(workspace.documents, 'chapter'),
		...documentsOfKind(workspace.documents, 'back-matter')
	];
}

function headingMarkup(heading: TypesetDocumentHeading): string {
	return [
		heading.label ? `<p class="chapter-label">${escapeXml(heading.label)}</p>` : '',
		heading.title ? `<h1>${escapeXml(heading.title)}</h1>` : ''
	].join('');
}

function xhtmlDocument(title: string, heading: TypesetDocumentHeading, body: string): string {
	return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles/book.css" />
</head>
<body>
  <main>
    ${headingMarkup(heading)}
    ${body}
  </main>
</body>
</html>`;
}

function coverDocument(title: string, assetPath: string): string {
	return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head><meta charset="utf-8" /><title>${escapeXml(title)}</title><link rel="stylesheet" type="text/css" href="../styles/book.css" /></head>
<body class="cover"><img src="${escapeXml(assetPath)}" alt="${escapeXml(title)}" /></body>
</html>`;
}

const BOOK_STYLES = `
@page { margin: 8%; }
html { color: #171a18; background: #fff; }
body { font-family: "Libre Baskerville", Georgia, serif; line-height: 1.55; hyphens: auto; }
main { max-width: 36em; margin: 0 auto; }
h1 { margin: 18vh 0 3rem; text-align: center; font-size: 1.6em; font-weight: normal; letter-spacing: .04em; }
.chapter-label { margin: 18vh 0 .85em; text-align: center; text-indent: 0; font-size: .78em; font-weight: bold; letter-spacing: .12em; text-transform: uppercase; }
.chapter-label + h1 { margin-top: 0; }
h2, h3 { margin-top: 2em; }
p { margin: 0; text-indent: 1.4em; orphans: 2; widows: 2; }
h1 + p, h2 + p, h3 + p, blockquote p, li p { text-indent: 0; }
blockquote { margin: 1.5em 2em; font-style: italic; }
figure { margin: 1.5em auto; text-align: center; }
figure img { height: auto; }
.media-left { text-align: left; }
.media-right { text-align: right; }
.cover { margin: 0; padding: 0; text-align: center; }
.cover img { display: block; width: 100%; height: 100%; object-fit: contain; }
`;

export async function buildEpub(workspace: WorkspaceSnapshot): Promise<Blob> {
	const zip = new JSZip();
	zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
	zip.file(
		'META-INF/container.xml',
		'<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
	);
	zip.file('OEBPS/styles/book.css', BOOK_STYLES);

	const assets = new Map(workspace.assets.map((asset) => [asset.id, asset]));
	const assetFiles = new Map<string, string>();
	for (const asset of workspace.assets) {
		const path = `images/${asset.id}.${extensionFor(asset)}`;
		assetFiles.set(asset.id, path);
		zip.file(`OEBPS/${path}`, asset.bytes);
	}

	const documents = orderedDocuments(workspace);
	for (const manuscriptDocument of documents) {
		const html = richTextToHtml(
			manuscriptDocument.body,
			(assetId) => `../${assetFiles.get(assetId) ?? ''}`
		);
		zip.file(
			`OEBPS/text/${manuscriptDocument.id}.xhtml`,
			xhtmlDocument(
				manuscriptDocument.title,
				typesetDocumentHeading(workspace.project, workspace.documents, manuscriptDocument),
				html
			)
		);
	}

	const frontCover = workspace.project.frontCoverAssetId
		? assets.get(workspace.project.frontCoverAssetId)
		: undefined;
	const backCover = workspace.project.backCoverAssetId
		? assets.get(workspace.project.backCoverAssetId)
		: undefined;

	if (frontCover) {
		zip.file(
			'OEBPS/text/front-cover.xhtml',
			coverDocument('Front cover', `../${assetFiles.get(frontCover.id)}`)
		);
	}
	if (backCover) {
		zip.file(
			'OEBPS/text/back-cover.xhtml',
			coverDocument('Back cover', `../${assetFiles.get(backCover.id)}`)
		);
	}

	const navigationEntries = documents
		.map(
			(manuscriptDocument) =>
				`<li><a href="text/${manuscriptDocument.id}.xhtml">${escapeXml(manuscriptDocument.title)}</a></li>`
		)
		.join('');
	zip.file(
		'OEBPS/nav.xhtml',
		`<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${navigationEntries}</ol></nav></body></html>`
	);

	const assetManifest = workspace.assets
		.map(
			(asset) =>
				`<item id="asset-${asset.id}" href="${assetFiles.get(asset.id)}" media-type="${escapeXml(asset.mimeType)}"${frontCover?.id === asset.id ? ' properties="cover-image"' : ''}/>`
		)
		.join('\n');
	const documentManifest = documents
		.map(
			(manuscriptDocument) =>
				`<item id="doc-${manuscriptDocument.id}" href="text/${manuscriptDocument.id}.xhtml" media-type="application/xhtml+xml"/>`
		)
		.join('\n');
	const spine = documents
		.map((manuscriptDocument) => `<itemref idref="doc-${manuscriptDocument.id}"/>`)
		.join('\n');

	zip.file(
		'OEBPS/content.opf',
		`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:${workspace.project.id}</dc:identifier>
    <dc:title>${escapeXml(workspace.project.title)}</dc:title>
    <dc:creator>${escapeXml(workspace.project.author)}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="styles" href="styles/book.css" media-type="text/css"/>
    ${frontCover ? '<item id="front-cover-page" href="text/front-cover.xhtml" media-type="application/xhtml+xml"/>' : ''}
    ${backCover ? '<item id="back-cover-page" href="text/back-cover.xhtml" media-type="application/xhtml+xml"/>' : ''}
    ${documentManifest}
    ${assetManifest}
  </manifest>
  <spine>
    ${frontCover ? '<itemref idref="front-cover-page"/>' : ''}
    ${spine}
    ${backCover ? '<itemref idref="back-cover-page"/>' : ''}
  </spine>
</package>`
	);

	return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}

export async function exportEpub(workspace: WorkspaceSnapshot): Promise<void> {
	const epub = await buildEpub(workspace);
	downloadBlob(epub, `${safeFileName(workspace.project.title)}.epub`);
}
