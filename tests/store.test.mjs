import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../js/store.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => { data[key] = value; },
    removeItem: (key) => { delete data[key]; },
    data,
  };
}

const publishedTab = { id: 'p1', title: 'Published', lines: [[{ type: 'bar' }]], updatedAt: '2026-01-01' };

async function loadedStore(storage = memoryStorage(), tabs = [publishedTab]) {
  const store = createStore({ fetchJson: async () => ({ version: 1, tabs }), storage, now: () => '2026-11-20' });
  await store.load();
  return store;
}

test('lists published tabs', async () => {
  assert.equal((await loadedStore()).list().length, 1);
});
test('saved tab appears in the list', async () => {
  const store = await loadedStore();
  store.save({ id: 'n1', title: 'New', lines: [[]] });
  assert.equal(store.list().length, 2);
});
test('saved tab counts as unpublished', async () => {
  const store = await loadedStore();
  store.save({ id: 'n1', title: 'New', lines: [[]] });
  assert.equal(store.unpublishedCount(), 1);
});
test('removing a published tab hides it', async () => {
  const store = await loadedStore();
  store.remove('p1');
  assert.equal(store.list().length, 0);
});
test('local edits survive a reload', async () => {
  const storage = memoryStorage();
  (await loadedStore(storage)).save({ id: 'n1', title: 'New', lines: [[]] });
  assert.equal((await loadedStore(storage)).list().length, 2);
});
test('edits retire once the exported file is published', async () => {
  const storage = memoryStorage();
  const store = await loadedStore(storage);
  store.save({ id: 'n1', title: 'New', lines: [[]] });
  const published = JSON.parse(store.exportJson()).tabs;
  assert.equal((await loadedStore(storage, published)).unpublishedCount(), 0);
});
test('import makes the library match the file', async () => {
  const store = await loadedStore();
  store.importJson(JSON.stringify({ tabs: [{ id: 'x', title: 'X', lines: [] }] }));
  assert.deepEqual(store.list().map((tab) => tab.id), ['x']);
});
test('import rejects an invalid file', async () => {
  const store = await loadedStore();
  assert.throws(() => store.importJson('{"tabs":[{"title":"no id"}]}'));
});
