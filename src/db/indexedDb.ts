import type { SavedProject } from '../types/editor';

const DATABASE_NAME = 'mindPaintDb';
// Dexie stores schema version 1 as native IndexedDB version 10.
// Keeping 10 lets this dependency-free adapter open existing user databases.
export const DATABASE_VERSION = 10;
const PROJECT_STORE = 'projects';

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECT_STORE)) {
        const store = database.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
        store.createIndex('name', 'name');
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error('Unable to open project database'));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error('Project database upgrade is blocked by another tab'));
    };
  });
  return databasePromise;
}

function writeProject(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<void> {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE, mode);
    action(transaction.objectStore(PROJECT_STORE));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Project database write failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Project database write was aborted'));
  }));
}

export function sortProjectsByUpdatedAt(projects: SavedProject[]) {
  return [...projects].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function saveProject(project: SavedProject) {
  return writeProject('readwrite', (store) => store.put(project));
}

export async function listProjects(): Promise<SavedProject[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE, 'readonly');
    const request = transaction.objectStore(PROJECT_STORE).getAll();
    request.onsuccess = () => resolve(sortProjectsByUpdatedAt(request.result as SavedProject[]));
    request.onerror = () => reject(request.error ?? new Error('Unable to list projects'));
  });
}

export async function getProject(id: string): Promise<SavedProject | undefined> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE, 'readonly');
    const request = transaction.objectStore(PROJECT_STORE).get(id);
    request.onsuccess = () => resolve(request.result as SavedProject | undefined);
    request.onerror = () => reject(request.error ?? new Error('Unable to load project'));
  });
}

export function deleteProject(id: string) {
  return writeProject('readwrite', (store) => store.delete(id));
}
