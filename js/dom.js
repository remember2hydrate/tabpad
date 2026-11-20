// Tiny DOM builder. Text always goes through textContent, so tab data can't inject HTML.

export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (name.startsWith('on')) element.addEventListener(name.slice(2).toLowerCase(), value);
    else if (name === 'class') element.className = value;
    else if (name === 'dataset') Object.assign(element.dataset, value);
    else if (name in element && typeof value !== 'string') element[name] = value;
    else element.setAttribute(name, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

let toastTimer = null;

export function showToast(message, { tone = 'info' } = {}) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, tone === 'error' ? 6000 : 2500);
}

export function downloadText(filename, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = h('a', { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function safeFilename(name) {
  return name.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-') || 'tab';
}
