// Read-only view of one tab with format toggle, copy and download.

import { h, showToast, downloadText, safeFilename } from '../dom.js';
import { renderTab, renderTabDocument } from '../render.js';
import { createFormatToggle } from './format-toggle.js';

function notFound(root) {
  root.replaceChildren(h('div', { class: 'page' },
    h('h1', {}, 'This tab doesn\'t exist'),
    h('p', {}, 'It may have been deleted or the link is wrong. ', h('a', { href: '#/' }, 'Back to all tabs'))));
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied');
  } catch (error) {
    showToast(`Copy failed: ${error.message}`, { tone: 'error' });
  }
}

export function renderDetail({ store, root, id }) {
  const tab = store.get(id);
  if (!tab) {
    notFound(root);
    return;
  }

  const output = h('pre', { class: 'tab-output', tabindex: '0', 'aria-label': 'Tablature' });
  const toggle = createFormatToggle((format) => { output.textContent = renderTab(tab.lines, format) || 'This tab is empty.'; });
  output.textContent = renderTab(tab.lines, toggle.format) || 'This tab is empty.';

  function deleteTab() {
    if (!confirm(`Delete "${tab.title}"?`)) return;
    store.remove(tab.id);
    showToast('Deleted. Export JSON to publish the deletion.');
    location.hash = '#/';
  }

  root.replaceChildren(h('article', { class: 'page page--detail' },
    h('a', { class: 'back', href: '#/' }, 'All tabs'),
    h('header', { class: 'detail-head' },
      h('h1', {}, tab.title),
      h('p', { class: 'meta' },
        tab.artist ? h('span', {}, tab.artist) : null,
        tab.genre ? h('span', { class: 'genre-tag' }, tab.genre) : null,
        store.isUnpublished(tab.id) ? h('span', { class: 'badge' }, 'Unpublished') : null)),
    tab.notes ? h('p', { class: 'notes' }, tab.notes) : null,
    h('div', { class: 'toolbar' },
      toggle.element,
      h('div', { class: 'toolbar__end' },
        h('button', { type: 'button', class: 'button', onClick: () => copyToClipboard(output.textContent) }, 'Copy'),
        h('button', {
          type: 'button', class: 'button',
          onClick: () => downloadText(`${safeFilename(tab.title)}.txt`, renderTabDocument(tab, toggle.format)),
        }, 'Download .txt'),
        h('a', { class: 'button button--primary', href: `#/edit/${encodeURIComponent(tab.id)}` }, 'Edit'),
        h('button', { type: 'button', class: 'button button--danger', onClick: deleteTab }, 'Delete'))),
    output));
}
