import { getSyncQueue, removeMutation, getPendingCount } from './offlineDb';

const MAX_RETRIES = 3;
let isSyncing = false;
let listenersInitialized = false;

/**
 * Process all pending mutations in the sync queue.
 * Replays HTTP requests via the api axios instance.
 * @returns {Promise<{ succeeded: number, failed: number }>}
 */
export async function processSyncQueue() {
  if (isSyncing) return { succeeded: 0, failed: 0 };
  isSyncing = true;

  try {
    // Dynamic import to avoid circular dependency with api.js
    const { default: api } = await import('./api.js');
    const queue = await getSyncQueue();

    if (queue.length === 0) return { succeeded: 0, failed: 0 };

    let succeeded = 0;
    let failed = 0;

    // Sort by timestamp to process in order
    const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp);

    for (const entry of sorted) {
      try {
        const config = {
          url: entry.url,
          method: entry.method,
          headers: entry.headers || {},
        };
        if (entry.body && entry.method !== 'DELETE') {
          config.data = entry.body;
          config.headers['Content-Type'] = 'application/json';
        }

        await api(config);
        await removeMutation(entry.id);
        succeeded++;
      } catch {
        entry.retryCount = (entry.retryCount || 0) + 1;
        if (entry.retryCount >= MAX_RETRIES) {
          await removeMutation(entry.id);
        }
        failed++;
      }
    }

    return { succeeded, failed };
  } finally {
    isSyncing = false;
  }
}

/**
 * Queue a mutation for later sync when backend reconnects.
 * @param {object} mutation - { storeName, url, method, body, headers }
 */
export function queueMutation(mutation) {
  import('./offlineDb.js').then(({ enqueueMutation }) => {
    enqueueMutation(mutation).catch(() => {
      // Queue full or DB error — silently drop
    });
  }).catch(() => {
    // offlineDb import failed — silently drop
  });
}

/**
 * Get the count of pending mutations.
 * @returns {Promise<number>}
 */
export async function getPendingSyncCount() {
  return getPendingCount();
}

/**
 * Initialize sync engine event listeners.
 * Safe to call multiple times — only registers once.
 * Listens for backend:reachable and online events to trigger sync.
 */
export function initSyncEngine() {
  if (listenersInitialized) return;
  listenersInitialized = true;

  const handleSync = async () => {
    const pending = await getPendingCount();
    if (pending === 0) return;

    try {
      const Swal = (await import('sweetalert2')).default;
      const { succeeded, failed } = await processSyncQueue();

      if (succeeded > 0) {
        Swal.fire({
          icon: 'success',
          title: 'Synced',
          text: `${succeeded} change${succeeded !== 1 ? 's' : ''} synced successfully.`,
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }
      if (failed > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Sync issue',
          text: `${failed} change${failed !== 1 ? 's' : ''} could not be synced.`,
          timer: 4000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }
    } catch {
      // Sync will retry on next reconnect
    }
  };

  window.addEventListener('backend:reachable', handleSync);
  window.addEventListener('online', () => {
    // Small delay to let the backend connection stabilize
    setTimeout(handleSync, 2000);
  });
}
