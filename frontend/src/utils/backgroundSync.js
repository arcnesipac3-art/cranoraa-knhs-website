const QUEUE_KEY = 'knhs_sync_queue';
const MAX_QUEUE_SIZE = 50;

/**
 * Background Sync Manager.
 * Queues failed mutation requests (POST/PUT/PATCH/DELETE) and
 * replays them when the backend becomes reachable again.
 */
const backgroundSync = {
  /**
   * Queue a failed mutation for later retry.
   * @param {object} entry
   * @param {string} entry.url - Full request URL
   * @param {string} entry.method - HTTP method
   * @param {object} [entry.data] - Request body
   * @param {object} [entry.headers] - Request headers (e.g., Authorization)
   */
  enqueue({ url, method, data, headers }) {
    const queue = this.getQueue();

    // Deduplicate: if same URL + method already queued, update it
    const existing = queue.findIndex(
      (q) => q.url === url && q.method === method
    );
    const entry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url,
      method: method.toUpperCase(),
      data,
      headers,
      timestamp: Date.now(),
      retries: 0,
    };

    if (existing >= 0) {
      queue[existing] = entry;
    } else {
      queue.push(entry);
    }

    // Enforce max queue size — drop oldest
    while (queue.length > MAX_QUEUE_SIZE) {
      queue.shift();
    }

    this._save(queue);
    return entry.id;
  },

  /**
   * Get the full sync queue.
   * @returns {Array}
   */
  getQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
    } catch {
      return [];
    }
  },

  /**
   * Process the queue by replaying all pending mutations.
   * Called when the backend becomes reachable.
   * @param {Function} axiosInstance - The api axios instance
   * @returns {Promise<{succeeded: number, failed: number}>}
   */
  async processQueue(axiosInstance) {
    const queue = this.getQueue();
    if (queue.length === 0) return { succeeded: 0, failed: 0 };

    let succeeded = 0;
    let failed = 0;
    const remaining = [];

    for (const entry of queue) {
      try {
        const config = {
          headers: entry.headers || {},
        };
        if (entry.data && entry.method !== 'DELETE') {
          // Reconstruct FormData if it was serialized
          config.headers['Content-Type'] = 'application/json';
        }

        await axiosInstance({
          url: entry.url,
          method: entry.method,
          data: entry.data,
          headers: entry.headers,
        });
        succeeded++;
      } catch {
        entry.retries = (entry.retries || 0) + 1;
        if (entry.retries < 3) {
          remaining.push(entry);
        }
        failed++;
      }
    }

    this._save(remaining);
    return { succeeded, failed };
  },

  /**
   * Remove a specific entry from the queue.
   * @param {string} id - Entry ID
   */
  remove(id) {
    const queue = this.getQueue().filter((e) => e.id !== id);
    this._save(queue);
  },

  /**
   * Clear the entire queue.
   */
  clear() {
    localStorage.removeItem(QUEUE_KEY);
  },

  /**
   * Get queue length.
   * @returns {number}
   */
  length() {
    return this.getQueue().length;
  },

  _save(queue) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // localStorage full — clear oldest entries
      while (queue.length > 10) {
        queue.shift();
      }
      try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      } catch {
        // Give up
      }
    }
  },
};

export default backgroundSync;
