// Library: search, genre filter, list of tabs, and the publish (export/import) controls.

import { h, showToast, downloadText } from '../dom.js';

const ALL_GENRES = '';

// Case- and accent-insensitive, so "ζεϊμπέκικο" matches "Ζεϊμπεκικο".
export function normalizeForSearch(text) {
  return (text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('el');
}

export function matchesQuery(tab, query) {
  const haystack = normalizeForSearch([tab.title, tab.artist, tab.genre, tab.notes].join(' '));
  return normalizeForSearch(query).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

function uniqueGenres(tabs) {
  const genres = tabs.map((tab) => tab.genre?.trim()).filter(Boolean);
  return [...new Set(genres)].sort((first, second) => first.localeCompare(second, 'el'));
}

function tabRow(tab, isUnpublished) {
  return h('li', {},
    h('a', { class: 'tab-row', href: `#/tab/${encodeURIComponent(tab.id)}` },
      h('span', { class: 'tab-row__title' }, tab.title),
      h('span', { class: 'tab-row__artist' }, tab.artist || ''),
      h('span', { class: 'tab-row__genre' }, tab.genre || ''),
      isUnpublished ? h('span', { class: 'badge', title: 'Saved in this browser only' }, 'Unpublished') : null));
}

function publishPanel(store, rerender) {
  const count = store.unpublishedCount();
  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', hidden: true,
    onChange: async (event) => {
      const [file] = event.target.files;
      if (!file) return;
      try {
        const imported = store.importJson(await file.text());
        showToast(`Imported ${imported} tabs`);
        rerender();
      } catch (error) {
        showToast(`Import failed: ${error.message}`, { tone: 'error' });
      }
    },
  });

  const exportButton = h('button', {
    type: 'button', class: count > 0 ? 'button button--primary' : 'button',
    onClick: () => downloadText('tabs.json', store.exportJson(), 'application/json'),
  }, 'Export JSON');

  const discardButton = count > 0 ? h('button', {
    type: 'button', class: 'button button--quiet',
    onClick: () => {
      if (!confirm(`Discard ${count} unpublished change${count === 1 ? '' : 's'}? This can't be undone.`)) return;
      store.discardLocalEdits();
      rerender();
    },
  }, 'Discard changes') : null;

  const message = count > 0
    ? `${count} unpublished change${count === 1 ? '' : 's'} in this browser. Export, then commit the file as data/tabs.json to publish.`
    : 'Everything is published. Export JSON any time for a backup.';

  return h('section', { class: count > 0 ? 'publish publish--pending' : 'publish', 'aria-live': 'polite' },
    h('p', {}, message),
    h('div', { class: 'publish__actions' },
      exportButton,
      h('button', { type: 'button', class: 'button', onClick: () => fileInput.click() }, 'Import JSON'),
      discardButton,
      fileInput));
}

export function renderLibrary({ store, root }) {
  let query = '';
  let genre = ALL_GENRES;

  const list = h('ul', { class: 'tab-list' });
  const genreBar = h('div', { class: 'genres', role: 'group', 'aria-label': 'Filter by genre' });
  const publishSlot = h('div');

  function sortedVisibleTabs() {
    return store.list()
      .filter((tab) => genre === ALL_GENRES || tab.genre?.trim() === genre)
      .filter((tab) => matchesQuery(tab, query))
      .sort((first, second) => first.title.localeCompare(second.title, 'el'));
  }

  function renderGenres() {
    const options = [ALL_GENRES, ...uniqueGenres(store.list())];
    genreBar.replaceChildren(...options.map((option) => h('button', {
      type: 'button',
      class: 'chip',
      'aria-pressed': String(option === genre),
      onClick: () => { genre = option; refresh(); },
    }, option || 'All')));
  }

  function renderList() {
    const tabs = sortedVisibleTabs();
    if (tabs.length > 0) {
      list.replaceChildren(...tabs.map((tab) => tabRow(tab, store.isUnpublished(tab.id))));
      return;
    }
    const nothingSaved = store.list().length === 0;
    list.replaceChildren(h('li', { class: 'empty' },
      nothingSaved ? 'No tabs yet. ' : 'No tabs match your search. ',
      nothingSaved ? h('a', { href: '#/new' }, 'Write the first one') : null));
  }

  function refresh() {
    renderGenres();
    renderList();
    publishSlot.replaceChildren(publishPanel(store, refresh));
  }

  const search = h('input', {
    type: 'search', class: 'search', placeholder: 'Search title, artist, genre or notes',
    'aria-label': 'Search tabs',
    onInput: (event) => { query = event.target.value; renderList(); },
  });

  root.replaceChildren(h('div', { class: 'page page--library' },
    h('div', { class: 'library-head' },
      h('h1', {}, 'Tabs'),
      h('a', { class: 'button button--primary', href: '#/new' }, 'New tab')),
    search, genreBar, list, publishSlot));
  refresh();
  if (matchMedia('(pointer: fine)').matches) search.focus();
}
