import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

async function filesBelow(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) => {
			const path = join(directory, entry.name);
			return entry.isDirectory() ? filesBelow(path) : Promise.resolve([path]);
		})
	);
	return nested.flat();
}

describe('TypeScript source policy', () => {
	it('contains no JavaScript application modules', async () => {
		const files = await filesBelow('src');
		expect(files.filter((file) => ['.js', '.jsx'].includes(extname(file)))).toEqual([]);
	});

	it('keeps broad escape-hatch types out of application source', async () => {
		const files = (await filesBelow('src')).filter((file) =>
			['.ts', '.svelte'].includes(extname(file))
		);
		const violations: string[] = [];
		for (const file of files) {
			const source = await readFile(file, 'utf8');
			const sources = file.endsWith('.svelte')
				? [...source.matchAll(/<script\b[^>]*lang=(["'])ts\1[^>]*>([\s\S]*?)<\/script>/g)].map(
						(match) => match[2] ?? ''
					)
				: [source];

			for (const typedSource of sources) {
				const sourceFile = ts.createSourceFile(
					file,
					typedSource,
					ts.ScriptTarget.Latest,
					true,
					ts.ScriptKind.TS
				);
				let broadTypeFound = false;
				const visit = (node: ts.Node): void => {
					if (
						node.kind === ts.SyntaxKind.AnyKeyword ||
						node.kind === ts.SyntaxKind.UnknownKeyword
					) {
						broadTypeFound = true;
					}
					ts.forEachChild(node, visit);
				};
				ts.forEachChild(sourceFile, visit);
				if (broadTypeFound) violations.push(file);
			}
		}
		expect([...new Set(violations)]).toEqual([]);
	});

	it('uses TypeScript in every Svelte script block', async () => {
		const files = (await filesBelow('src')).filter((file) => file.endsWith('.svelte'));
		const violations: string[] = [];
		for (const file of files) {
			const source = await readFile(file, 'utf8');
			for (const match of source.matchAll(/<script\b([^>]*)>/g)) {
				const attributes = match[1] ?? '';
				const isStructuredData = /type=(["'])application\/ld\+json\1/.test(attributes);
				if (!isStructuredData && !/lang=(["'])ts\1/.test(attributes)) violations.push(file);
			}
		}
		expect(violations).toEqual([]);
	});
});
