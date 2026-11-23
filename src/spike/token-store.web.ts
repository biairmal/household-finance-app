// Web: the refresh token lives in IndexedDB (spec: refresh tokens are stored only on the device).
const KEY = 'googleRefreshToken';

const store = <T,>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open('household-money-auth', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const req = op(open.result.transaction('kv', mode).objectStore('kv'));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    };
  });

export const getRefreshToken = () => store<string | undefined>('readonly', (s) => s.get(KEY)).then((v) => v ?? null);
export const setRefreshToken = (t: string) => store<void>('readwrite', (s) => s.put(t, KEY));
export const clearRefreshToken = () => store<void>('readwrite', (s) => s.delete(KEY));
