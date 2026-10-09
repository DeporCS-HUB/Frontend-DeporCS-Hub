import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadCache } from '../src/lib/read-cache.js';
test('identical concurrent reads share one request and fresh responses are reused', async () => {
 const cache = createReadCache(); let calls = 0;
 const read = () => cache.read('/dashboard', async () => { calls++; return { data: calls }; });
 const values = await Promise.all([read(), read(), read()]);
 assert.equal(calls, 1); assert.deepEqual(values, [{ data: 1 }, { data: 1 }, { data: 1 }]);
 assert.deepEqual(await read(), { data: 1 }); assert.equal(calls, 1);
});
test('expired responses and explicit retry fetch new data', async () => {
 let clock = 0; let calls = 0; const cache = createReadCache({ ttl: 30, now: () => clock });
 const fetcher = async () => ++calls;
 assert.equal(await cache.read('x', fetcher), 1);
 clock = 30; assert.equal(cache.peek('x'), undefined);
 assert.equal(await cache.read('x', fetcher), 2);
 assert.equal(await cache.read('x', fetcher, { force: true }), 3);
});
test('errors are retried and never cached', async () => {
 const cache = createReadCache();
 await assert.rejects(cache.read('x', async () => { throw Error('Unavailable'); }), /Unavailable/);
 assert.equal(await cache.read('x', async () => 'recovered'), 'recovered');
});
test('cleared pending requests cannot overwrite newer data or remove its pending request', async () => {
 const cache = createReadCache(); let resolveOld, resolveNew;
 const old = cache.read('x', () => new Promise(resolve => { resolveOld = resolve; }));
 await Promise.resolve(); cache.clear();
 const current = cache.read('x', () => new Promise(resolve => { resolveNew = resolve; }));
 await Promise.resolve(); resolveOld('old'); await old;
 assert.equal(cache.peek('x'), undefined);
 const duplicate = cache.read('x', () => { throw Error('Must deduplicate'); });
 resolveNew('new'); assert.equal(await current, 'new'); assert.equal(await duplicate, 'new');
 assert.equal(cache.peek('x'), 'new');
});
test('memory use is bounded while retaining the newest read', async () => {
 const cache = createReadCache({ limit: 2 });
 for (const key of ['a','b','c']) await cache.read(key, async () => key);
 assert.equal(cache.peek('a'), undefined); assert.equal(cache.peek('c'), 'c');
});
