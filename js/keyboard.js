// Keyboard entry: string key (d / a / D), then the fret, e.g. "d5", "a0", "D12".
// Frets 0 and 2–9 commit instantly. After "1" the app waits for a second digit;
// press Shift to enter fret 1 on its own. Space adds an empty timing column.
// Greek keyboard layout works too: δ = d, α = a, Δ = D, ψ = c.

import { MAX_FRET, isStringKey } from './music.js';

const GREEK_LAYOUT = Object.freeze({ δ: 'd', α: 'a', Δ: 'D', ψ: 'c', Ψ: 'c' });

const COMMAND_KEYS = Object.freeze({
  Enter: 'newLine',
  Backspace: 'remove',
  Delete: 'remove',
  ArrowLeft: 'cursorLeft',
  ArrowRight: 'cursorRight',
  '|': 'bar',
  ' ': 'space',
  c: 'toggleChord',
  '{': 'repeatOpen',
  '}': 'repeatClose',
});

function normalizeKey(key) {
  return GREEK_LAYOUT[key] ?? key;
}

function isDigit(key) {
  return /^\d$/.test(key);
}

function shouldWaitForSecondDigit(digits) {
  return digits === '1';
}

/**
 * @param {{ onNote(stringKey: string, fret: number): void,
 *           onCommand(command: string): void,
 *           onPendingChange(pending: string): void,
 *           onError(message: string): void }} handlers
 */
export function createKeyboardInput(handlers) {
  let pending = null; // { stringKey, digits }

  function setPending(next) {
    pending = next;
    handlers.onPendingChange(pending ? `${pending.stringKey}${pending.digits}` : '');
  }

  function commit() {
    if (!pending) return;
    const { stringKey, digits } = pending;
    setPending(null);
    if (digits === '') return;
    const fret = Number(digits);
    if (fret > MAX_FRET) {
      handlers.onError(`Fret ${fret} is above ${MAX_FRET}`);
      return;
    }
    handlers.onNote(stringKey, fret);
  }

  function handleDigit(digit) {
    if (!pending) {
      handlers.onError('Type a string first: d, a or D');
      return;
    }
    setPending({ ...pending, digits: pending.digits + digit });
    if (!shouldWaitForSecondDigit(pending.digits)) commit();
  }

  function handleCommandKey(key) {
    const command = COMMAND_KEYS[key];
    if (command === 'remove' && pending) {
      setPending(null);
      return;
    }
    commit();
    handlers.onCommand(command);
  }

  /** Returns true when the key was used, so the caller can preventDefault. */
  function handleKey(rawKey, { isRepeat = false } = {}) {
    const key = normalizeKey(rawKey);
    // Shift also starts "D" and "|": committing first gives the same result as today.
    // Returns false so Shift still works as a modifier.
    if (key === 'Shift') {
      if (!isRepeat) commit();
      return false;
    }
    if (isStringKey(key)) {
      commit();
      setPending({ stringKey: key, digits: '' });
      return true;
    }
    if (isDigit(key)) {
      handleDigit(key);
      return true;
    }
    if (key === 'Escape') {
      setPending(null);
      return true;
    }
    if (key in COMMAND_KEYS) {
      handleCommandKey(key);
      return true;
    }
    return false;
  }

  return { handleKey, cancel: () => setPending(null) };
}
