# Boosts

Arc-style Boosts for Chrome: customize any website with your own HTML, CSS and
JavaScript, saved per site or per page.

## Install

1. `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → pick this folder.
2. Open the extension's **Details** and turn on **Allow User Scripts**. Without it,
   scripts fall back to a `<script>` tag, which sites with a strict CSP block.
   CSS, HTML and zaps work either way.

## Use

Click the toolbar icon or press **Alt+B** on any page to open the floating panel.
Drag the header to move it, drag any edge or corner to resize it, and use the
expand button (or double-click the header) for a large editing size.

- **Elements**: *Select element* (or right-click → *Boost this element*), then write
  HTML to insert before, at the start, at the end, after, or in place of it. Each
  injection can carry a script where `el` is the target and `nodes` are the inserted
  nodes. ↑/↓ walk to the parent/child, *All similar* drops the `:nth-child` so it
  matches every sibling like it.
- **CSS**: applied live, cascades after the page's own styles. *Pick selector* drops
  a rule for any element you click.
- **Script**: runs in the page once the DOM is ready, on every load. Ctrl+Enter runs it now.
- **Format** (or Shift+Alt+F in any editor) pretty-prints HTML, CSS and JS with
  [js-beautify](https://github.com/beautifier/js-beautify) (vendored in `lib/`, MIT, loaded on
  first use). Ctrl+Z undoes it.
- **Zap**: click things to hide them for good (right-click → *Zap this element* works too).

While picking: arrow keys move through the tree, Enter chooses, Esc stops.

*Applies to* switches a boost between the whole site (host) and this exact page
(host + path). A site can have several boosts; switch, add or delete them from the
menu under the boost name. **All boosts** lists everything, with toggles and JSON
import/export.

## How it works

- `src/core.js`: content script at `document_start`. Applies matching boosts: CSS
  through adopted stylesheets (no flash, not blocked by the page's CSP), HTML injections
  after the DOM is parsed, and re-applies them as the page or SPA route changes.
- `src/ui.js`: the panel, in a closed shadow root so page CSS can't touch it.
- `src/background.js`: runs scripts in the page's main world via `chrome.userScripts.execute`.
- Storage: `chrome.storage.local`, one `boost:<id>` key per boost.
