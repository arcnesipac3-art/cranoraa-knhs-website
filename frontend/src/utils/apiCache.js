const CACHE_PREFIX = 'knhs_cache:';
const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Application-level cache for API responses.
 * Stores data in localStorage with TTL expiration.
 * Used by useOfflineFetch to serve cached data when offline.
 */
const apiCache = {
  /**
   * Store data in cache.
   * @param {string} key - Cache key (typically the API URL)
   * @param {*} data - Data to cache
   * @param {number} [ttl] - Time-to-live in milliseconds
   */
  set(key, data, ttl = DEFAULT_TTL) {
    try {
      const entry = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // localStorage full — evict oldest entries
      this._evict(5);
      try {
        localStorage.setItem(
          CACHE_PREFIX + key,
          JSON.stringify({ data, timestamp: Date.now(), ttl })
        );
      } catch {
        // Still full — give up silently
      }
    }
  },

  /**
   * Retrieve data from cache.
   * Returns null if expired or missing.
   * @param {string} key - Cache key
   * @returns {*} Cached data or null
   */
  get(key) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;

      const entry = JSON.parse(raw);
      const age = Date.now() - entry.timestamp;

      if (age > entry.ttl) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  },

  /**
   * Get cached data regardless of TTL (for offline fallback).
   * Returns null if missing, but ignores expiration.
   * @param {string} key - Cache key
   * @returns {*} Cached data or null
   */
  getStale(key) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw).data;
    } catch {
      return null;
    }
  },

  /**
   * Check if a valid (non-expired) cache entry exists.
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  },

  /**
   * Remove a specific cache entry.
   * @param {string} key - Cache key
   */
  remove(key) {
    localStorage.removeItem(CACHE_PREFIX + key);
  },

  /**
   * Clear all cache entries.
   */
  clear() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  },

  /**
   * Evict the oldest N entries.
   * @param {number} count - Number of entries to remove
   */
  _evict(count) {
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) {
        try {
          const raw = localStorage.getItem(k);
          const parsed = JSON.parse(raw);
          entries.push({ key: k, timestamp: parsed.timestamp || 0 });
        } catch {
          entries.push({ key: k, timestamp: 0 });
        }
      }
    }
    entries.sort((a, b) => a.timestamp - b.timestamp);
    entries.slice(0, count).forEach((e) => localStorage.removeItem(e.key));
  },

  /**
   * Get cache size in bytes (approximate).
   * @returns {number}
   */
  size() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) {
        total += localStorage.getItem(k)?.length || 0;
      }
    }
    return total * 2; // UTF-16 = 2 bytes per char
  },
};

export default apiCache;
