// Minimal IndexedDB helper for offline storage + outbox
export const DB_NAME = 'apiaryapp';
export const DB_VERSION = 1;
let _db;

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains('apiaries')) db.createObjectStore('apiaries', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('hives')) db.createObjectStore('hives', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('inspections')) db.createObjectStore('inspections', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function store(name, mode = 'readonly') {
  return _db.transaction(name, mode).objectStore(name);
}

export function idbPut(name, value) {
  return new Promise((res, rej) => {
    const r = store(name, 'readwrite').put(value);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export function idbDelete(name, key) {
  return new Promise((res, rej) => {
    const r = store(name, 'readwrite').delete(key);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

export function idbGetAll(name) {
  return new Promise((res, rej) => {
    const r = store(name).getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
}

export function outboxAdd(action) {
  // action: { table, op, payload }
  return new Promise((res, rej) => {
    const r = store('outbox', 'readwrite').add(action);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export function outboxAll() {
  return new Promise((res, rej) => {
    const r = store('outbox').getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
}

export function outboxClear() {
  return new Promise((res, rej) => {
    const r = store('outbox', 'readwrite').clear();
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}
