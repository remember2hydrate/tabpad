// Entry point: loads the library and routes between views by URL hash.
//   #/            library
//   #/tab/<id>    read a tab
//   #/edit/<id>   edit a tab
//   #/new         new tab

import { h, showToast } from './dom.js';
import { createStore } from './store.js';
import { renderLibrary } from './views/library.js';
import { renderDetail } from './views/detail.js';
import { renderEditor } from './views/editor.js';

const root = document.getElementById('app');

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not load ${url} (HTTP ${response.status})`);
  return response.json();
}

// Falls back to memory when the browser blocks storage, and says so: edits would vanish on reload.
function browserStorage() {
  try {
    const storage = window.localStorage;
    storage.setItem('tabpad.probe', '1');
    storage.removeItem('tabpad.probe');
    return storage;
  } catch {
    const memory = new Map();
    setTimeout(() => showToast('This browser blocks storage. Edits will be lost on reload; export JSON to keep them.', { tone: 'error' }));
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    };
  }
}

const store = createStore({ fetchJson, storage: browserStorage() });

function parseRoute(hash) {
  const [, view = '', rawId = ''] = hash.replace(/^#/, '').split('/');
  return { view, id: decodeURIComponent(rawId) };
}

let activeView = {};
let currentHash = location.hash;

function render() {
  const { view, id } = parseRoute(location.hash);
  activeView.cleanup?.();
  activeView = {};
  window.scrollTo(0, 0);
  if (view === 'tab') renderDetail({ store, root, id });
  else if (view === 'edit') activeView = renderEditor({ store, root, id });
  else if (view === 'new') activeView = renderEditor({ store, root, id: null });
  else renderLibrary({ store, root });
  currentHash = location.hash;
}

function onHashChange() {
  if (activeView.canLeave && !activeView.canLeave()) {
    history.replaceState(null, '', currentHash || '#/');
    return;
  }
  render();
}

function showLoadError(error) {
  root.replaceChildren(h('div', { class: 'page' },
    h('h1', {}, 'The library didn\'t load'),
    h('p', {}, error.message),
    h('p', {}, 'Check that data/tabs.json exists and is valid JSON, then reload.')));
}

async function start() {
  try {
    await store.load();
  } catch (error) {
    showLoadError(error);
    return;
  }
  window.addEventListener('hashchange', onHashChange);
  render();
}

window.addEventListener('error', (event) => showToast(`Something went wrong: ${event.message}`, { tone: 'error' }));
start();
