// ======================================
// BOUNDED CACHE (zero-dependency LRU + TTL)
// ======================================
// A minimal Map-backed LRU with per-entry TTL. Prevents the unbounded
// process-lifetime maps that leak memory under load. Insertion order of a
// JS Map is its recency order once we delete-then-set on every access, so
// the first key is always the least-recently-used.
//
//   const c = new BoundedCache({ max: 5000, ttl: 5 * 60_000 });
//   c.set(key, value); c.get(key); c.delete(key);
// ======================================

class BoundedCache {
  constructor({ max = 1000, ttl = 0 } = {}) {
    this.max = max;
    this.ttl = ttl; // 0 = no expiry
    this.map = new Map(); // key -> { value, expires }
  }

  get(key) {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (this.ttl && hit.expires <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // Refresh recency: re-insert so this key moves to the newest position.
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }

  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expires: this.ttl ? Date.now() + this.ttl : 0 });
    // Evict oldest until within bounds.
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
    return value;
  }

  delete(key) {
    return this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }
}

module.exports = BoundedCache;
