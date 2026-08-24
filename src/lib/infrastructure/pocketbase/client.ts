import PocketBase from 'pocketbase';

const configuredUrl = import.meta.env.PUBLIC_POCKETBASE_URL;
export const pocketBaseUrl = configuredUrl?.trim() || 'http://localhost:8090';
export const pocketBaseClient = new PocketBase(pocketBaseUrl);

pocketBaseClient.autoCancellation(false);
