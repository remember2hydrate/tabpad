import { h } from '../dom.js';
import { FORMATS } from '../render.js';

const LABELS = Object.freeze({ [FORMATS.numbers]: 'Numbers', [FORMATS.greek]: 'Ρε Λα' });

/** Segmented control; numbers is the default. */
export function createFormatToggle(onChange) {
  let current = FORMATS.numbers;
  const buttons = Object.values(FORMATS).map((format) => h('button', {
    type: 'button',
    'aria-pressed': String(format === current),
    title: format === FORMATS.greek ? 'Greek note names' : 'Fret numbers',
    onClick: () => {
      current = format;
      buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(Object.values(FORMATS)[index] === current)));
      onChange(current);
    },
  }, LABELS[format]));

  return {
    element: h('div', { class: 'segmented', role: 'group', 'aria-label': 'Tab format' }, buttons),
    get format() { return current; },
  };
}
