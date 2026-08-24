import { afterEach, describe, expect, it } from 'vitest';
import {
	createManuscriptDocument,
	createNovelProject,
	createStoryNote
} from '$lib/domain/factories';
import { WriteANovelDatabase } from './database';
import { LocalLibraryRepository } from './local-library-repository';

const databases: WriteANovelDatabase[] = [];

function repository(): { database: WriteANovelDatabase; library: LocalLibraryRepository } {
	const database = new WriteANovelDatabase(`writeanovel-test-${crypto.randomUUID()}`);
	databases.push(database);
	return { database, library: new LocalLibraryRepository(database) };
}

afterEach(async () => {
	await Promise.all(databases.splice(0).map((database) => database.delete()));
});

describe('local library repository', () => {
	it('stores a complete project workspace transactionally', async () => {
		const { library } = repository();
		const project = createNovelProject({ title: 'Northbound', author: 'A. Writer' });
		const chapter = createManuscriptDocument({
			projectId: project.id,
			kind: 'chapter',
			title: 'Arrival',
			position: 1_000
		});
		const character = createStoryNote({
			projectId: project.id,
			kind: 'character',
			title: 'Mara'
		});

		await library.createProject(project, chapter);
		await library.saveNote(character);
		const workspace = await library.getWorkspace(project.id);

		expect(workspace?.project.title).toBe('Northbound');
		expect(workspace?.documents.map((item) => item.title)).toEqual(['Arrival']);
		expect(workspace?.notes.map((item) => item.title)).toEqual(['Mara']);
	});

	it('deletes all child records with a project', async () => {
		const { database, library } = repository();
		const project = createNovelProject({ title: 'Temporary', author: '' });
		const chapter = createManuscriptDocument({
			projectId: project.id,
			kind: 'chapter',
			title: 'Only chapter',
			position: 1_000
		});
		await library.createProject(project, chapter);
		await library.deleteProject(project.id);

		expect(await library.getWorkspace(project.id)).toBeUndefined();
		expect(await database.documents.count()).toBe(0);
	});
});
