# TabPad

Baglamas tablature (D-A-D) editor and library. Static site for GitHub Pages: no backend, no build, no GitHub token in the browser.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # unit tests (Node 20+)
```

ES modules need a server; opening `index.html` from disk won't work.

## Publish on GitHub Pages

1. Create a repo named `tabpad` and push this folder to `main`.
2. Repo **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The site is live at `https://<user>.github.io/tabpad/` in about a minute.

## How saving works

| Who | Sees | Can edit |
|---|---|---|
| Everyone | Tabs in `data/tabs.json` | Only in their own browser; nothing reaches the repo |
| You | Same, plus your unpublished edits | Publish by committing the exported file |

1. Write or edit tabs. They save to this browser (`localStorage`) and show an **Unpublished** badge.
2. In **Tabs**, click **Export JSON**. You get `tabs.json` with the full library.
3. Replace `data/tabs.json` in the repo with it and commit (GitHub web upload works).
4. After Pages redeploys, reload: published edits retire automatically.

Backups: every commit of `data/tabs.json` is a backup in Git history, and **Export JSON** gives you a local copy any time. **Import JSON** restores a file into the browser (it becomes unpublished edits until you commit it).

Risk: unpublished edits exist only in one browser. Clearing site data or switching device loses them. Export before you do either.

## Entering notes

| Method | How |
|---|---|
| Fretboard | Click a note. The headstock column is the open string (fret 0). |
| Keyboard | `d` top, `a` middle, `D` bass, then the fret. `0` and `2–9` enter instantly; after `1` type the second digit, or `Shift` for fret 1. `Space` adds an empty column for timing. Greek layout works (`δ α Δ`). |
| Text | `d0 - a2 \| d5+a7 - _ x2` (`-` = empty column), one tab line per text line. Open **Type or paste as text**. |

Keys: `←` `→` move the cursor, `Backspace` removes the highlighted column, `Enter` starts a new line, `c` toggles chord mode (notes stack in one column), `|` bar, `{` `}` repeats, `Ctrl+Z` undo. Rests and `x2–x4` are buttons. Click any column to select it; new notes insert after the selection.

## Data format (`data/tabs.json`)

```json
{
  "version": 1,
  "tabs": [{
    "id": "t-example", "title": "Practice line", "artist": "", "genre": "Exercise", "notes": "",
    "createdAt": "2026-11-20T00:00:00.000Z", "updatedAt": "2026-11-20T00:00:00.000Z",
    "lines": [[
      { "type": "note", "frets": { "d": 5, "a": 7 } },
      { "type": "bar" },
      { "type": "space" },
      { "type": "rest", "value": "_" },
      { "type": "repeat", "value": "x2" }
    ]]
  }]
}
```

`d` = top line, `a` = middle, `D` = bass (bottom line). Frets 0–19. The file is validated on load and on import; an invalid file shows an error instead of loading half a library.

## Files

| Path | Job |
|---|---|
| `js/music.js` | Tuning, note names (Ντο … Σι) |
| `js/tab-model.js` | Tab events and editing operations |
| `js/render.js` | Text tablature, numbers or Greek |
| `js/parser.js` | Text input ⇄ tab events |
| `js/keyboard.js` | Keyboard entry state machine |
| `js/store.js`, `js/validate.js` | Published + local library, export/import |
| `js/fretboard.js` | Click grid over `assets/fretboard.png` (geometry constants at the top) |
| `js/views/` | Library, tab, editor pages |

Fretboard image: [bouzouksis.com](https://www.bouzouksis.com).
