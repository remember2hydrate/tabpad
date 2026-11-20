// Library storage without any GitHub access from the browser.
//   published: data/tabs.json, committed to the repo by you, read by everyone.
//   local:     your unpublished edits, kept in this browser's localStorage.
// What you see = published overlaid with local edits. "Export JSON" downloads that
// combined view; commit it as data/tabs.json to publish, and the local edits retire.

import { validateLibraryFile } from './validate.js';

export const PUBLISHED_URL = 'data/tabs.json';
const LOCAL_KEY = 'tabpad.localEdits.v1';
const FILE_VERSION = 1;

function isTombstone(entry) {
  return entry.deleted === true;
}

// A local edit retires once the published file contains exactly that edit.
function isAlreadyPublished(localEntry, publishedTab) {
  if (isTombstone(localEntry)) return !publishedTab;
  return JSON.stringify(localEntry) === JSON.stringify(publishedTab);
}

function pruneLocalEdits(localEdits, publishedById) {
  return Object.fromEntries(
    Object.entries(localEdits).filter(([id, entry]) => !isAlreadyPublished(entry, publishedById.get(id))),
  );
}

function readLocalEdits(storage) {
  const raw = storage.getItem(LOCAL_KEY);
  return raw ? JSON.parse(raw) : {};
}

/**
 * @param {{ fetchJson(url: string): Promise<unknown>,
 *           storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
 *           now?: () => string }} deps
 */
export function createStore({ fetchJson, storage, now = () => new Date().toISOString() }) {
  let publishedById = new Map();
  let localEdits = {};

  function persistLocalEdits() {
    if (Object.keys(localEdits).length === 0) storage.removeItem(LOCAL_KEY);
    else storage.setItem(LOCAL_KEY, JSON.stringify(localEdits));
  }

  async function load() {
    const file = await fetchJson(PUBLISHED_URL);
    const errors = validateLibraryFile(file);
    if (errors.length > 0) throw new Error(`${PUBLISHED_URL} is invalid: ${errors[0]}`);
    publishedById = new Map(file.tabs.map((tab) => [tab.id, tab]));
    localEdits = pruneLocalEdits(readLocalEdits(storage), publishedById);
    persistLocalEdits();
  }

  function list() {
    const merged = new Map(publishedById);
    for (const [id, entry] of Object.entries(localEdits)) {
      if (isTombstone(entry)) merged.delete(id);
      else merged.set(id, entry);
    }
    return [...merged.values()];
  }

  function get(id) {
    return list().find((tab) => tab.id === id) ?? null;
  }

  function save(tab) {
    const stamped = { ...tab, updatedAt: now(), createdAt: tab.createdAt ?? now() };
    localEdits = { ...localEdits, [tab.id]: stamped };
    persistLocalEdits();
    return stamped;
  }

  function remove(id) {
    localEdits = publishedById.has(id)
      ? { ...localEdits, [id]: { id, deleted: true, updatedAt: now() } }
      : Object.fromEntries(Object.entries(localEdits).filter(([key]) => key !== id));
    persistLocalEdits();
  }

  function unpublishedCount() {
    return Object.keys(localEdits).length;
  }

  function isUnpublished(id) {
    return id in localEdits;
  }

  function exportJson() {
    const tabs = list().sort((first, second) => first.id.localeCompare(second.id));
    return JSON.stringify({ version: FILE_VERSION, exportedAt: now(), tabs }, null, 2);
  }

  // Makes the library match the file exactly, as unpublished edits on top of published.
  function importJson(text) {
    const file = JSON.parse(text);
    const errors = validateLibraryFile(file);
    if (errors.length > 0) throw new Error(errors.join('\n'));
    const importedIds = new Set(file.tabs.map((tab) => tab.id));
    const edits = {};
    for (const tab of file.tabs) {
      if (JSON.stringify(publishedById.get(tab.id)) !== JSON.stringify(tab)) edits[tab.id] = tab;
    }
    for (const id of publishedById.keys()) {
      if (!importedIds.has(id)) edits[id] = { id, deleted: true, updatedAt: now() };
    }
    localEdits = edits;
    persistLocalEdits();
    return file.tabs.length;
  }

  function discardLocalEdits() {
    localEdits = {};
    persistLocalEdits();
  }

  return { load, list, get, save, remove, unpublishedCount, isUnpublished, exportJson, importJson, discardLocalEdits };
}

export function newTabId() {
  const random = Math.random().toString(36).slice(2, 6);
  return `t-${Date.now().toString(36)}-${random}`;
}
