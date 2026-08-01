const DB_NAME = 'knhs-offline';
const DB_VERSION = 1;

// All object stores for offline-cached data
export const STORES = Object.freeze({
  ANNOUNCEMENTS: 'announcements',
  PROFILE: 'profile',
  SUBJECTS: 'subjects',
  GRADES: 'grades',
  ATTENDANCE: 'attendance',
  MATERIALS: 'materials',
  CALENDAR: 'calendar',
  SYNC_QUEUE: 'syncQueue',
  META: 'meta',
});

const STORE_NAMES = Object.values(STORES);

let dbInstance = null;
let dbPromise = null;

/**
 * Initialize the IndexedDB database.
 * Safe to call multiple times — returns the same promise.
 * Must be called before any other offlineDb operations.
 */
export function initOfflineDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      for (const storeName of STORE_NAMES) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          // Add timestamp index for staleness checks on data stores
          if (storeName !== STORES.SYNC_QUEUE && storeName !== STORES.META) {
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        }
      }

      // syncQueue uses a auto-generated key
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
      }

      // meta store for last-synced timestamps, etc.
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;

      // Handle connection loss
      dbInstance.onclose = () => {
        dbInstance = null;
        dbPromise = null;
      };

      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Get the database instance, initializing if needed.
 */
async function getDb() {
  if (dbInstance) return dbInstance;
  return initOfflineDb();
}

/**
 * Run a read-only transaction on a store.
 */
function readStore(storeName, callback) {
  return getDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const result = callback(store);
        if (result && typeof result.onsuccess !== 'undefined') {
          // IDBRequest
          result.onsuccess = () => resolve(result.result);
          result.onerror = () => reject(result.error);
        } else {
          tx.oncomplete = () => resolve(result);
          tx.onerror = () => reject(tx.error);
        }
      })
  );
}

/**
 * Run a readwrite transaction on a store.
 */
function writeStore(storeName, callback) {
  return getDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const result = callback(store);
        tx.oncomplete = () => {
          if (result && typeof result.result !== 'undefined') {
            resolve(result.result);
          } else {
            resolve(undefined);
          }
        };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      })
  );
}

// ── Generic CRUD ──────────────────────────────────────────────────────────────

/**
 * Upsert a single item into a store.
 * Automatically sets `updatedAt` to now.
 */
export async function putItem(storeName, item) {
  const entry = {
    ...item,
    updatedAt: Date.now(),
  };
  return writeStore(storeName, (store) => store.put(entry));
}

/**
 * Bulk upsert items into a store.
 * All items get `updatedAt` set to now.
 */
export async function putItems(storeName, items) {
  return getDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const now = Date.now();
        for (const item of items) {
          store.put({ ...item, updatedAt: now });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      })
  );
}

/**
 * Get a single item by key.
 */
export async function getItem(storeName, key) {
  return readStore(storeName, (store) => store.get(key));
}

/**
 * Get all items in a store.
 */
export async function getAll(storeName) {
  return readStore(storeName, (store) => store.getAll());
}

/**
 * Delete a single item by key.
 */
export async function deleteItem(storeName, key) {
  return writeStore(storeName, (store) => store.delete(key));
}

/**
 * Clear all items in a store.
 */
export async function clearStore(storeName) {
  return writeStore(storeName, (store) => store.clear());
}

/**
 * Count items in a store.
 */
export async function countItems(storeName) {
  return readStore(storeName, (store) => store.count());
}

// ── Sync Queue ────────────────────────────────────────────────────────────────

const MAX_SYNC_QUEUE = 100;

/**
 * Queue a mutation for later sync.
 * @param {object} mutation - { storeName, url, method, body, headers }
 * @returns {string} The mutation ID
 */
export async function enqueueMutation({ storeName, url, method, body, headers }) {
  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const entry = {
    id,
    storeName,
    url,
    method: method.toUpperCase(),
    body: body || null,
    headers: headers || null,
    timestamp: Date.now(),
    retryCount: 0,
  };

  return getDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        store.put(entry);

        // Enforce max size — drop oldest
        const countReq = store.count();
        countReq.onsuccess = () => {
          if (countReq.result > MAX_SYNC_QUEUE) {
            const cursorReq = store.index('timestamp').openCursor();
            let toDelete = countReq.result - MAX_SYNC_QUEUE;
            cursorReq.onsuccess = (e) => {
              const cursor = e.target.result;
              if (cursor && toDelete > 0) {
                store.delete(cursor.primaryKey);
                toDelete--;
                cursor.continue();
              }
            };
          }
        };

        tx.oncomplete = () => resolve(id);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      })
  );
}

/**
 * Get all pending mutations in the sync queue.
 */
export async function getSyncQueue() {
  return getAll(STORES.SYNC_QUEUE);
}

/**
 * Remove a mutation from the sync queue after successful sync.
 */
export async function removeMutation(id) {
  return deleteItem(STORES.SYNC_QUEUE, id);
}

/**
 * Clear the entire sync queue.
 */
export async function clearSyncQueue() {
  return clearStore(STORES.SYNC_QUEUE);
}

/**
 * Get the count of pending mutations.
 */
export async function getPendingCount() {
  return countItems(STORES.SYNC_QUEUE);
}

// ── Metadata (last-synced timestamps) ─────────────────────────────────────────

/**
 * Get the last-synced timestamp for a store.
 */
export async function getLastSynced(storeName) {
  const entry = await readStore(STORES.META, (store) =>
    store.get(`lastSynced:${storeName}`)
  );
  return entry?.value || null;
}

/**
 * Set the last-synced timestamp for a store.
 */
export async function setLastSynced(storeName, timestamp) {
  return writeStore(STORES.META, (store) =>
    store.put({ key: `lastSynced:${storeName}`, value: timestamp })
  );
}

// ── Bulk Operations ───────────────────────────────────────────────────────────

/**
 * Clear all data stores (not the sync queue).
 * Useful on logout.
 */
export async function clearAllData() {
  const dataStores = STORE_NAMES.filter(
    (s) => s !== STORES.SYNC_QUEUE && s !== STORES.META
  );
  return getDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(dataStores, 'readwrite');
        for (const storeName of dataStores) {
          tx.objectStore(storeName).clear();
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

/**
 * Clear everything — data, sync queue, and metadata.
 */
export async function clearAll() {
  return getDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAMES, 'readwrite');
        for (const storeName of STORE_NAMES) {
          tx.objectStore(storeName).clear();
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}
