import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
			if (/\b(any|unknown)\b/.test(source)) violations.push(file);
		}
		expect(violations).toEqual([]);
	});

	it('uses TypeScript in every Svelte script block', async () => {
		const files = (await filesBelow('src')).filter((file) => file.endsWith('.svelte'));
		const violations: string[] = [];
		for (const file of files) {
			const source = await readFile(file, 'utf8');
			if (/<script(?![^>]*lang="ts")/.test(source)) violations.push(file);
		}
		expect(violations).toEqual([]);
	});
});
