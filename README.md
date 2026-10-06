# Boosts

Arc-style [Boosts](https://resources.arc.net/hc/en-us/articles/19212718608151-Boosts-Customize-Any-Website)
for Chrome: customize any website with your own HTML, CSS and JavaScript, saved per site
or per page.

Pick an element like in DevTools, inject markup around it, attach scripts, restyle the
page, or zap distractions for good. It all happens in a floating panel on the page itself.

## Install

1. Download `boosts-<version>.zip` from the [latest release](../../releases/latest) and unzip it
   (or clone this repo).
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick
   the unzipped folder.
3. Open Boosts' **Details** and turn on **Allow User Scripts**. Without it, scripts fall
   back to a `<script>` tag, which sites with a strict security policy (Gmail, GitHub, …)
   block. CSS, HTML and zaps work either way.

Requires Chrome 135 or newer.

## Use

Click the toolbar icon or press **Alt+B** on any page to open the panel. Drag the header
to move it, drag any edge to resize it, and use the expand button for a large editing size.

- **Elements**: *Select element* (or right-click → *Boost this element*), then write HTML
  to insert before, at the start, at the end, after, or in place of it. Each injection
  can carry a script, where `el` is the target and `node`/`nodes` are what you inserted.
- **CSS**: applied live, after the page's own styles. *Pick selector* adds a rule for any
  element you click.
- **Script**: runs in the page on every load. Ctrl+Enter runs it now.
- **Zap**: click things to hide them for good.
- **Format** (Shift+Alt+F) pretty-prints any editor; **wrap** (Alt+Z) toggles word wrap per field.

A boost applies to a whole site (host) or one page (host + path), and a site can have
several. **All boosts** lists everything, with toggles and JSON import/export.

The built-in **Handbook** (button in the panel footer) documents every feature, the
element-script API, the `data-boost-*` attributes and how to work with strict sites like Gmail.

## Permissions and privacy

| Permission | Why |
| --- | --- |
| Access to all sites (`<all_urls>`) | Boosts can apply to any site you choose, from the moment the page starts loading. |
| `userScripts` | Runs your boost scripts in the page, also on sites whose security policy blocks injected scripts. Only active once you turn on *Allow User Scripts*. |
| `scripting` | Opens the panel on tabs that were open before Boosts was installed, and the fallback script runner. |
| `storage` | Saves your boosts and panel layout locally. |
| `contextMenus` | The *Boost this element* / *Zap this element* right-click items. |
| `tabs`, `activeTab` | Finds the current tab for the toolbar button and the keyboard shortcut. |
| `favicon` | Site icons in the *All boosts* list, read from Chrome's local cache. |

- Everything stays on your machine, in `chrome.storage.local`. Boosts makes no network
  requests of its own: no analytics, no remote code, no account.
- Boost scripts run with the same access as the site they target. They can read and change
  anything on that site, including your logged-in session. Only write or import scripts
  you understand. Importing asks for confirmation when a file contains scripts.

## How it works

- `src/core.js`: a content script that runs at `document_start` in every page. CSS goes in
  through adopted stylesheets (no flash, not blocked by the page's security policy), and HTML
  injections are added once the DOM is parsed and re-applied as the page or app route changes.
- `src/ui.js`: the panel, in a closed shadow root so the page's CSS can't touch it.
- `src/background.js`: runs scripts in the page via `chrome.userScripts.execute`.
- `handbook.html`: the user handbook. Document new `data-boost-*` attributes there.

No build step: the repo is the extension.

## Credits

- [js-beautify](https://github.com/beautifier/js-beautify) (MIT), vendored in `lib/` for the
  Format button.
- Icon shapes from [Material Design Icons](https://github.com/google/material-design-icons)
  (Apache 2.0).

## License

[MIT](LICENSE) © Magnus Dalkvist
