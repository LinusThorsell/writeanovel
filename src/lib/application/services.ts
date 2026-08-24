import { LibraryService } from './library-service';
import { SyncService } from './sync-service';
import { LocalLibraryRepository } from '$lib/infrastructure/local/local-library-repository';
import { PocketBaseAccountService } from '$lib/infrastructure/pocketbase/account-service';
import { PocketBaseCloudLibraryGateway } from '$lib/infrastructure/pocketbase/cloud-library-gateway';

const localRepository = new LocalLibraryRepository();
const cloudGateway = new PocketBaseCloudLibraryGateway();
const syncService = new SyncService(localRepository, cloudGateway);

export const accountService = new PocketBaseAccountService();
export const libraryService = new LibraryService(localRepository, syncService);
