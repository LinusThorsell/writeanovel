import Dexie, { type Table } from 'dexie';
import type {
	AppPreferences,
	ManuscriptDocument,
	MediaAsset,
	NovelProject,
	PendingChange,
	StoryNote
} from '$lib/domain/types';

export class WriteABookDatabase extends Dexie {
	projects!: Table<NovelProject, string>;
	documents!: Table<ManuscriptDocument, string>;
	notes!: Table<StoryNote, string>;
	assets!: Table<MediaAsset, string>;
	preferences!: Table<AppPreferences, string>;
	outbox!: Table<PendingChange, string>;

	constructor(name = 'writeabook') {
		super(name);
		this.version(1).stores({
			projects: 'id, updatedAt',
			documents: 'id, projectId, [projectId+kind], position, updatedAt',
			notes: 'id, projectId, [projectId+kind], updatedAt',
			assets: 'id, projectId, updatedAt',
			preferences: 'id',
			outbox: 'id, [entityType+entityId], projectId, enqueuedAt'
		});
	}
}

export const localDatabase = new WriteABookDatabase();
