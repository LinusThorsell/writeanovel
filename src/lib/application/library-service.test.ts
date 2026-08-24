import { afterEach, describe, expect, it } from 'vitest';
import type { CloudLibraryItem, CloudLibraryPort, SyncableEntity } from './ports';
import { LibraryService } from './library-service';
import { SyncService } from './sync-service';
import { createManuscriptDocument, createNovelProject } from '$lib/domain/factories';
import type { PendingChange } from '$lib/domain/types';
import { WriteANovelDatabase } from '$lib/infrastructure/local/database';
import { LocalLibraryRepository } from '$lib/infrastructure/local/local-library-repository';

class RecordingCloud implements CloudLibraryPort {
	pushes: SyncableEntity[] = [];
	deletions: PendingChange[] = [];

	async listItems(): Promise<CloudLibraryItem[]> {
		return [];
	}

	async pushEntity(entity: SyncableEntity): Promise<CloudLibraryItem> {
		this.pushes.push(entity);
		const projectId = entity.entityType === 'project' ? entity.data.id : entity.data.projectId;
		return {
			...entity,
			entityId: entity.data.id,
			projectId,
			updatedAt: entity.data.updatedAt,
			deleted: false
		};
	}

	async pushDeletion(change: PendingChange): Promise<CloudLibraryItem> {
		this.deletions.push(change);
		return {
			entityType: change.entityType,
			entityId: change.entityId,
			projectId: change.projectId,
			updatedAt: change.enqueuedAt,
			deleted: true
		};
	}
}

const databases: WriteANovelDatabase[] = [];

function services() {
	const database = new WriteANovelDatabase(`writeanovel-service-test-${crypto.randomUUID()}`);
	databases.push(database);
	const local = new LocalLibraryRepository(database);
	const cloud = new RecordingCloud();
	const sync = new SyncService(local, cloud);
	return { local, cloud, service: new LibraryService(local, sync) };
}

afterEach(async () => {
	await Promise.all(databases.splice(0).map((database) => database.delete()));
});

describe('storage routing', () => {
	it('never queues or contacts cloud storage for an anonymous free writer', async () => {
		const { local, cloud, service } = services();
		service.configureUser(undefined);
		const project = createNovelProject({ title: 'Local book', author: '' });
		const chapter = createManuscriptDocument({
			projectId: project.id,
			kind: 'chapter',
			title: 'Chapter 1',
			position: 1_000
		});

		await service.createProject(project, chapter);
		expect(await local.listPendingChanges()).toEqual([]);
		expect(cloud.pushes).toHaveLength(0);
	});

	it('explicitly migrates all local records after premium is enabled', async () => {
		const { cloud, service } = services();
		const project = createNovelProject({ title: 'Cloud book', author: '' });
		const chapter = createManuscriptDocument({
			projectId: project.id,
			kind: 'chapter',
			title: 'Chapter 1',
			position: 1_000
		});
		await service.createProject(project, chapter);
		service.configureUser({
			id: 'user-1',
			email: 'writer@example.test',
			displayName: 'Writer',
			isPremium: true
		});

		await service.migrateLocalProjects();
		expect(cloud.pushes.map((item) => item.entityType).sort()).toEqual(['document', 'project']);
	});
});
