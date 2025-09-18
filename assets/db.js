const DB_NAME = 'apiary-pwa-db';
const DB_VERSION = 1;
const STORES = ['apiaries', 'hives', 'inspections', 'outbox'];
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

export const save = (storeName, item) => {
  return new Promise(async (resolve, reject) => {
    if (!item.id) item.id = `offline_${Date.now()}_${Math.random()}`;
    
    const tx1 = db.transaction(storeName, 'readwrite');
    tx1.objectStore(storeName).put(item);
    await new Promise(r => tx1.oncomplete = r);
    
    const outboxItem = { id: `outbox_${Date.now()}`, store: storeName, data: item };
    const tx2 = db.transaction('outbox', 'readwrite');
    tx2.objectStore('outbox').put(outboxItem);
    tx2.oncomplete = () => resolve(item);
    tx2.onerror = (e) => reject(`Errore nel salvare in outbox: ${e.target.error}`);
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

export const clearAndInsert = async (storeName, items) => {
  return new Promise(async (resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    items.forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(`Errore bulk insert in ${storeName}: ${e.target.error}`);
  });
}

export const sync = async (supabaseClient) => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return true;

  const outboxItems = await getAll('outbox');
  if (outboxItems.length === 0) return true;

  for (const item of outboxItems) {
    const dataToInsert = { ...item.data };
    if (String(dataToInsert.id).startsWith('offline_')) {
      delete dataToInsert.id;
    }
    
    const { error } = await supabaseClient.from(item.store).upsert(dataToInsert);

    if (error) {
      console.error('Sync error:', error);
      return false;
    } else {
      const tx = db.transaction('outbox', 'readwrite');
      tx.objectStore('outbox').delete(item.id);
      await new Promise(r => tx.oncomplete = r);
    }
  }
  return true;
};
