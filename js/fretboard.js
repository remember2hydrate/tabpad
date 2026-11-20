// Clickable note grid laid over assets/fretboard.png.
// Geometry is measured from that image (1162 x 247 px); change these if the image changes.

import { h } from './dom.js';
import { STRINGS, MAX_FRET, greekNoteAt } from './music.js';

const IMAGE = Object.freeze({ width: 1162, height: 247 });
const NUT_X = 91;
const LAST_FRET_X = 960;
const OPEN_ZONE_X = 48;
const STRING_ROWS_Y = Object.freeze([{ top: 99, bottom: 124 }, { top: 125, bottom: 150 }, { top: 151, bottom: 174 }]);
const FRET_WIDTH = (LAST_FRET_X - NUT_X) / MAX_FRET;

const percentX = (x) => `${(x / IMAGE.width) * 100}%`;
const percentY = (y) => `${(y / IMAGE.height) * 100}%`;

function fretSpan(fret) {
  if (fret === 0) return { left: OPEN_ZONE_X, right: NUT_X - 2 };
  const left = NUT_X + (fret - 1) * FRET_WIDTH;
  return { left, right: left + FRET_WIDTH };
}

function noteButton(string, row, fret, onPick) {
  const { left, right } = fretSpan(fret);
  const { top, bottom } = STRING_ROWS_Y[row];
  const name = greekNoteAt(string.key, fret);
  return h('button', {
    type: 'button',
    class: fret === 0 ? 'fret-note fret-note--open' : 'fret-note',
    style: `left:${percentX(left)};width:${percentX(right - left)};top:${percentY(top)};height:${percentY(bottom - top)}`,
    title: `${string.key}${fret} · ${name}`,
    'aria-label': `String ${string.key}, fret ${fret}, ${name}`,
    onClick: () => onPick(string.key, fret),
  }, h('span', {}, name));
}

/** @param {(stringKey: string, fret: number) => void} onPick */
export function createFretboard(onPick) {
  const buttons = STRINGS.flatMap((string, row) =>
    Array.from({ length: MAX_FRET + 1 }, (_, fret) => noteButton(string, row, fret, onPick)));

  return h('figure', { class: 'fretboard' },
    h('div', { class: 'fretboard__scroll' },
      h('div', { class: 'fretboard__board' },
        h('img', { src: 'assets/fretboard.png', alt: 'Baglamas fretboard, 19 frets, tuned D A D', width: IMAGE.width, height: IMAGE.height }),
        ...buttons)),
    h('figcaption', { class: 'fretboard__credit' },
      'Fretboard image: ', h('a', { href: 'https://www.bouzouksis.com', target: '_blank', rel: 'noopener' }, 'bouzouksis.com')));
}
