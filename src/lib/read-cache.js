// Memory only: no response or credential is persisted between browser sessions.
export function createReadCache({ ttl = 30000, now = Date.now, limit = 100 } = {}) {
  const entries = new Map();
  function peek(key) {
    const entry = entries.get(key);
    return entry && entry.expires > now() ? entry.value : undefined;
  }
  function clear(key) { if (key === undefined) entries.clear(); else entries.delete(key); }
  function read(key, fetcher, { force = false } = {}) {
    if (force) clear(key);
    const cached = peek(key);
    if (cached !== undefined) return Promise.resolve(cached);
    const existing = entries.get(key);
    if (existing?.pending) return existing.pending;
    if (entries.size >= limit && !entries.has(key)) entries.delete(entries.keys().next().value);
    const entry = {};
    const pending = Promise.resolve().then(fetcher).then(value => {
      // A write or session change may have replaced this request while it ran.
      if (entries.get(key) === entry) { entry.value = value; entry.expires = now() + ttl; }
      return value;
    }).catch(error => {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    }).finally(() => { if (entries.get(key) === entry) delete entry.pending; });
    entry.pending = pending;
    entries.set(key, entry);
    return pending;
  }
  return { peek, read, clear };
}
