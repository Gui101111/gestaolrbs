/** Pequeno wrapper de IndexedDB: contas locais, projetos e arquivos de vídeo. */

const DB_NAME = 'tribuna';
const DB_VERSION = 1;
export type StoreName = 'users' | 'projects' | 'blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'email' });
        if (!db.objectStoreNames.contains('projects')) {
          const store = db.createObjectStore('projects', { keyPath: 'id' });
          store.createIndex('userId', 'userId');
        }
        if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result as T);
        tx.onerror = () => reject(tx.error ?? req.error);
        tx.onabort = () => reject(tx.error ?? new Error('Operação cancelada pelo navegador.'));
      }),
  );
}

export const idb = {
  get: <T>(store: StoreName, key: IDBValidKey) => run<T | undefined>(store, 'readonly', (s) => s.get(key)),
  put: (store: StoreName, value: unknown, key?: IDBValidKey) =>
    run<IDBValidKey>(store, 'readwrite', (s) => (key === undefined ? s.put(value) : s.put(value, key))),
  delete: (store: StoreName, key: IDBValidKey) => run<undefined>(store, 'readwrite', (s) => s.delete(key)),
  byIndex: <T>(store: StoreName, index: string, value: IDBValidKey) =>
    run<T[]>(store, 'readonly', (s) => s.index(index).getAll(value)),
};

export type BlobKind = 'source' | 'output' | 'logo';
const blobKey = (projectId: string, kind: BlobKind) => `${projectId}:${kind}`;

export const blobs = {
  get: (projectId: string, kind: BlobKind) => idb.get<Blob>('blobs', blobKey(projectId, kind)),
  put: (projectId: string, kind: BlobKind, blob: Blob) => idb.put('blobs', blob, blobKey(projectId, kind)),
  delete: (projectId: string, kind: BlobKind) => idb.delete('blobs', blobKey(projectId, kind)),
  async deleteAll(projectId: string) {
    await Promise.all((['source', 'output', 'logo'] as BlobKind[]).map((k) => blobs.delete(projectId, k)));
  },
};
