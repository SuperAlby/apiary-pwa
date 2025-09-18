const DB_NAME = 'apiary-pwa-db';
const DB_VERSION = 1;
const STORES = ['apiaries', 'hives', 'inspections']; // Rimosso 'outbox'
let db;

export const init = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject("Errore nell'aprire IndexedDB");
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      STORES.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id', autoIncrement: false });
        }
      });
    };
  });
};

// Funzione 'save' semplificata
export const save = (storeName, item) => {
  return new Promise((resolve, reject) => {
    if (!item.id) item.id = `offline_${Date.now()}_${Math.random()}`;
    
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(item);

    tx.oncomplete = () => resolve(item);
    tx.onerror = (e) => reject(`Errore nel salvare in ${storeName}: ${e.target.error}`);
  });
};

export const getAll = (storeName) => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(`Errore nel leggere da ${storeName}: ${e.target.error}`);
  });
};

// Questa funzione non è più usata nella modalità senza login, ma la lasciamo per il futuro
export const clearAndInsert = async (storeName, items) => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    items.forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(`Errore bulk insert in ${storeName}: ${e.target.error}`);
  });
}
