// Boosts panel: a floating, draggable editor living in a closed shadow root.
// Built lazily the first time it's toggled; everything it edits goes through
// the `__boosts` core API, which applies changes live and persists them.

(() => {
  const B = globalThis.__boosts;
  if (!B || B.ui) return;

  // ---------------------------------------------------------------- constants

  const SVG_NS = "http://www.w3.org/2000/svg";
  const ICONS = {
    bolt: "M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z",
    close: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    minimize: "M6 19h12v-2H6z",
    expand: "M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z",
    add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    delete: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
    play: "M8 5v14l11-7z",
    check: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    target: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
    eye: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
    eyeOff: "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z",
    code: "M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z",
    palette: "M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
    terminal: "M20 4H4c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 14H4V8h16v10zm-2-1h-6v-2h6v2zM7.5 17l-1.41-1.41L8.67 13l-2.59-2.59L7.5 9l4 4-4 4z",
    up: "M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z",
    down: "M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z",
    openNew: "M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
    layers: "M11.99 18.54 4.62 12.81 3 14.07l9 7 9-7-1.63-1.27zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z",
    warn: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
    format: "M3 21h18v-2H3v2zm0-4h12v-2H3v2zm0-4h18v-2H3v2zm0-4h12V7H3v2zm0-6v2h18V3H3z",
  };
  const POSITIONS = [
    ["before", "Before"],
    ["prepend", "Start"],
    ["append", "End"],
    ["after", "After"],
    ["replace", "Replace"],
  ];
  const TABS = [
    ["elements", "Elements", "code"],
    ["css", "CSS", "palette"],
    ["js", "Script", "terminal"],
    ["zap", "Zap", "eyeOff"],
  ];
  const PICK_EVENTS = ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "auxclick", "contextmenu"];
  const LINE_H = 19;

  // ---------------------------------------------------------------- state

  let host, shadow, ui;
  let open = false;
  let prefs = { x: null, y: null, w: 400, h: 620, tab: "elements", minimized: false };
  let boost = null;
  let draft = false;
  let expanded = null;
  let picking = null;
  let hoverEl = null;
  let hl = { targets: [], tone: "pick", label: false };
  let menu = null;
  let userScriptsOk = true;
  let statusTimer, prefsTimer, toastTimer;
  const counters = new Map(); // ruleId -> refresh fn

  // ---------------------------------------------------------------- tiny DOM kit

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "value" || k === "checked") el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
    return el;
  }

  function icon(name, cls = "") {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", `ic ${cls}`.trim());
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[name]);
    svg.append(path);
    return svg;
  }

  const btn = (cls, iconName, label, onclick, extra = {}) =>
    h("button", { class: `btn ${cls}`, type: "button", onclick, ...extra }, iconName && icon(iconName), label && h("span", null, label));

  const iconBtn = (iconName, title, onclick, cls = "") =>
    h("button", { class: `icon-btn ${cls}`, type: "button", title, "aria-label": title, onclick }, icon(iconName));

  // ---------------------------------------------------------------- selectors

  function stableToken(t) {
    if (!t || t.length > 40 || /[:[\]/@!]/.test(t) || /\d{4,}/.test(t)) return false;
    if (/^(css|sc|jsx|emotion|svelte|ng|_)[-_]/i.test(t)) return false;
    // Hashed names (Button_root__x8f2k, css-1a2b3c) mix letters and digits in one segment.
    return !t.split(/[-_]+/).some((seg) => seg.length >= 5 && /\d/.test(seg) && /[a-z]/i.test(seg));
  }

  function isUnique(sel) {
    try {
      return document.querySelectorAll(sel).length === 1;
    } catch {
      return false;
    }
  }

  function cssPath(el) {
    if (!(el instanceof Element)) return "";
    if (el.id && stableToken(el.id) && isUnique(`#${CSS.escape(el.id)}`)) return `#${CSS.escape(el.id)}`;
    const parts = [];
    for (let cur = el; cur instanceof Element; cur = cur.parentElement) {
      if (cur === document.documentElement || cur === document.body) {
        parts.unshift(cur.localName);
        break;
      }
      if (cur !== el && cur.id && stableToken(cur.id) && isUnique(`#${CSS.escape(cur.id)}`)) {
        parts.unshift(`#${CSS.escape(cur.id)}`);
        break;
      }
      let part = CSS.escape(cur.localName);
      const cls = [...cur.classList].filter(stableToken).slice(0, 2);
      part += cls.map((c) => `.${CSS.escape(c)}`).join("");
      const parent = cur.parentElement;
      if (parent) {
        const siblings = [...parent.children];
        if (siblings.filter((s) => s.matches(part)).length > 1) part += `:nth-child(${siblings.indexOf(cur) + 1})`;
      }
      parts.unshift(part);
      const sel = parts.join(" > ");
      if (isUnique(sel)) return sel;
    }
    return parts.join(" > ");
  }

  function firstMatch(sel) {
    try {
      return [...document.querySelectorAll(sel)].find((e) => !B.isOwnNode(e)) || null;
    } catch {
      return null;
    }
  }

  function allMatches(sel) {
    try {
      return sel ? [...document.querySelectorAll(sel)].filter((e) => !B.isOwnNode(e)) : [];
    } catch {
      return [];
    }
  }

  function describe(el) {
    const parts = [h("b", { class: "hl-tag" }, el.localName)];
    if (el.id) parts.push(h("span", { class: "hl-id" }, `#${el.id}`));
    const cls = [...el.classList].slice(0, 3).map((c) => `.${c}`).join("");
    if (cls) parts.push(h("span", { class: "hl-cls" }, cls));
    const r = el.getBoundingClientRect();
    parts.push(h("span", { class: "hl-dim" }, `${Math.round(r.width)} × ${Math.round(r.height)}`));
    return parts;
  }

  // ---------------------------------------------------------------- syntax highlighting

  const RE = {
    js: /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\[\s\S])*`?)|\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|from|async|await|try|catch|finally|throw|typeof|instanceof|in|of|this|null|undefined|true|false|default|yield|delete|void)\b|(\b(?:0x[\da-fA-F]+|\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?)\b)|([A-Za-z_$][\w$]*)(?=\s*\()/g,
    css: /(\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(@[\w-]+)|([{}])|(![\w]+)|(#[\da-fA-F]{3,8}\b|-?\b\d*\.?\d+(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr|ch|ex)?\b)|(--[\w-]+|[a-zA-Z-]+)(?=\s*:(?!:))/g,
    html: /(<!--[\s\S]*?(?:-->|$))|(<\/?[\w-]+)|(\/?>)|([\w:@.-]+)(?=\s*=)|("[^"]*"?|'[^']*'?)/g,
  };

  function highlight(lang, src) {
    const out = [];
    const push = (cls, text) => text && out.push(cls ? h("span", { class: `t-${cls}` }, text) : document.createTextNode(text));
    const re = RE[lang];
    re.lastIndex = 0;
    let at = 0;
    let depth = 0;
    let inTag = false;
    for (let m; (m = re.exec(src)); ) {
      if (!m[0]) {
        re.lastIndex++;
        continue;
      }
      push(lang === "css" && depth === 0 ? "sel" : "", src.slice(at, m.index));
      at = re.lastIndex;
      const g = m.findIndex((x, i) => i > 0 && x !== undefined);
      if (lang === "js") push(["", "com", "str", "kw", "num", "fn"][g], m[0]);
      else if (lang === "css") {
        if (g === 4) depth = Math.max(0, depth + (m[0] === "{" ? 1 : -1));
        const cls = ["", "com", "str", "at", "punc", "kw", "num", "prop"][g];
        push(depth === 0 && g > 4 ? "sel" : cls, m[0]);
      } else {
        if (g === 2) inTag = true;
        if (g === 3) inTag = false;
        const cls = ["", "com", "tag", "tag", "attr", "str"][g];
        push(g >= 4 && !inTag ? "" : cls, m[0]);
      }
    }
    push(lang === "css" && depth === 0 ? "sel" : "", src.slice(at));
    return out;
  }

  // ---------------------------------------------------------------- formatting

  const FORMAT_OPTIONS = {
    html: { indent_size: 2, wrap_line_length: 80, wrap_attributes: "auto", extra_liners: [], end_with_newline: false },
    css: { indent_size: 2, end_with_newline: false },
    js: { indent_size: 2, end_with_newline: false },
  };

  async function formatCode(lang, src) {
    if (!globalThis.beautifier) {
      const res = await chrome.runtime.sendMessage({ type: "loadFormatter" });
      if (!res?.ok || !globalThis.beautifier) throw new Error(res?.error || "Formatter failed to load");
    }
    return globalThis.beautifier[lang](src, FORMAT_OPTIONS[lang]);
  }

  // ---------------------------------------------------------------- code editor

  function insertText(ta, text) {
    const before = ta.value;
    ta.focus();
    document.execCommand("insertText", false, text);
    if (ta.value === before && text) {
      ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, "end");
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function createEditor({ lang, value, placeholder, onChange, onRun, grow = false, minLines = 5, maxLines = 16 }) {
    const ta = h("textarea", {
      class: "ed-input",
      spellcheck: "false",
      autocomplete: "off",
      autocapitalize: "off",
      wrap: "off",
      placeholder,
    });
    ta.value = value || "";
    const pre = h("pre", { class: "ed-hl", "aria-hidden": "true" });
    const lines = h("div", { class: "ed-lines" });
    const main = h("div", { class: "ed-main" }, pre, ta);
    const el = h("div", { class: `ed${grow ? " ed-grow" : ""}` }, h("div", { class: "ed-gutter" }, lines), main);
    let lineCount = 0;

    function paint() {
      pre.replaceChildren(...highlight(lang, ta.value + "\n "));
      const n = ta.value.split("\n").length;
      if (n !== lineCount) {
        lineCount = n;
        lines.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
        if (grow) main.style.height = `${Math.min(Math.max(n, minLines), maxLines) * LINE_H + 22}px`;
      }
    }

    ta.addEventListener("scroll", () => {
      pre.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
      lines.style.transform = `translateY(${-ta.scrollTop}px)`;
    });
    ta.addEventListener("input", () => {
      paint();
      onChange?.(ta.value);
    });
    ta.addEventListener("keydown", (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const { selectionStart: s, selectionEnd: t, value: v } = ta;
      if (e.shiftKey && e.altKey && e.code === "KeyF") {
        e.preventDefault();
        api.format();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        B.flush();
        toast("Saved");
      } else if (mod && e.key === "Enter" && onRun) {
        e.preventDefault();
        onRun();
      } else if (e.key === "Tab" && !mod) {
        e.preventDefault();
        if (s === t && !e.shiftKey) return insertText(ta, "  ");
        const start = v.lastIndexOf("\n", s - 1) + 1;
        const block = v.slice(start, t);
        const next = e.shiftKey ? block.replace(/^ {1,2}/gm, "") : block.replace(/^/gm, "  ");
        ta.setSelectionRange(start, t);
        insertText(ta, next);
        ta.setSelectionRange(start, start + next.length);
      } else if (e.key === "Enter" && !mod && !e.shiftKey && s === t) {
        const line = v.slice(v.lastIndexOf("\n", s - 1) + 1, s);
        const indent = line.match(/^[ \t]*/)[0];
        const opens =
          /[{([]\s*$/.test(line) || (lang === "html" && /<([a-z][\w-]*)(\s[^<>]*)?>\s*$/i.test(line) && !/<\/[^>]*>\s*$|\/>\s*$/.test(line));
        if (!opens) {
          e.preventDefault();
          insertText(ta, `\n${indent}`);
          return;
        }
        e.preventDefault();
        const closes = /^\s*([})\]]|<\/)/.test(v.slice(s));
        insertText(ta, `\n${indent}  ${closes ? `\n${indent}` : ""}`);
        if (closes) ta.setSelectionRange(s + indent.length + 3, s + indent.length + 3);
      }
    });

    paint();
    const api = {
      el,
      ta,
      /** Pretty-print in place; goes through insertText so Ctrl+Z undoes it. */
      async format() {
        if (!ta.value.trim()) return;
        let out;
        try {
          out = await formatCode(lang, ta.value);
        } catch (e) {
          return toast(`Couldn’t format: ${e.message}`);
        }
        if (out === ta.value) return;
        ta.focus();
        ta.select();
        insertText(ta, out);
        ta.setSelectionRange(0, 0);
        ta.scrollTop = 0;
      },
      get value() {
        return ta.value;
      },
      set value(v) {
        ta.value = v;
        paint();
      },
      insert(text, caretBack = 0) {
        insertText(ta, text);
        const p = ta.selectionStart - caretBack;
        ta.setSelectionRange(p, p);
      },
      focus: () => ta.focus(),
    };
    return api;
  }

  const formatBtn = (ed) => btn("text small", "format", "Format", () => ed.format(), { title: "Format code (Shift+Alt+F)" });

  // ---------------------------------------------------------------- boost editing

  function ensureBoost() {
    const cur = boost && (B.get(boost.id) || (draft ? boost : null));
    if (cur && B.matches(cur)) {
      boost = cur;
      return;
    }
    const list = B.forPage();
    if (list.length) {
      boost = list[0];
      draft = false;
    } else {
      boost = B.create();
      draft = true;
    }
    expanded = null;
  }

  function edit(fn, { rerender = false } = {}) {
    fn?.(boost);
    draft = false;
    B.update(boost);
    setStatus("Saving…");
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => setStatus("Saved"), 500);
    if (rerender) render();
    else {
      refreshCounts();
      renderTabs();
    }
  }

  function setStatus(text) {
    if (!ui) return;
    ui.status.textContent = draft ? "Not saved — start editing to create this boost" : text;
    ui.statusDot.className = `status-dot${draft ? " draft" : text === "Saved" ? " ok" : ""}`;
  }

  function newBoost() {
    closeMenu();
    const n = B.forPage().length;
    boost = B.create();
    if (n) boost.name += ` ${n + 1}`;
    expanded = null;
    edit(null, { rerender: true });
    ui.name.focus();
    ui.name.select();
  }

  function deleteBoost() {
    closeMenu();
    const gone = boost;
    const wasDraft = draft;
    if (!wasDraft) B.remove(gone.id);
    boost = null;
    ensureBoost();
    render();
    if (!wasDraft)
      toast(`Deleted “${gone.name}”`, "Undo", () => {
        boost = gone;
        edit(null, { rerender: true });
      });
  }

  function switchBoost(b) {
    closeMenu();
    boost = b;
    draft = !B.get(b.id);
    expanded = null;
    render();
  }

  // ---------------------------------------------------------------- picking + highlights

  function startPick(opts) {
    stopPick();
    picking = opts;
    for (const t of PICK_EVENTS) window.addEventListener(t, onPickEvent, true);
    window.addEventListener("pointermove", onPickMove, true);
    window.addEventListener("keydown", onPickKey, true);
    ui.panel.classList.add("is-picking");
    renderPickBar();
  }

  function stopPick() {
    if (!picking) return;
    picking = null;
    hoverEl = null;
    for (const t of PICK_EVENTS) window.removeEventListener(t, onPickEvent, true);
    window.removeEventListener("pointermove", onPickMove, true);
    window.removeEventListener("keydown", onPickKey, true);
    ui.panel.classList.remove("is-picking");
    clearHighlight();
    renderPickBar();
    if (prefs.tab === "zap") renderBody();
  }

  const fromPanel = (e) => e.composedPath().includes(host);

  function onPickMove(e) {
    if (fromPanel(e)) return setHover(null);
    setHover(e.target instanceof Element ? e.target : null);
  }

  function onPickEvent(e) {
    if (fromPanel(e)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === "click") commitPick(hoverEl || e.target);
  }

  function onPickKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopImmediatePropagation();
      return stopPick();
    }
    if (fromPanel(e) || !hoverEl) return;
    const nav = {
      ArrowUp: hoverEl.parentElement !== document.documentElement && hoverEl.parentElement,
      ArrowDown: [...hoverEl.children].find((c) => !B.isOwnNode(c)),
      ArrowLeft: hoverEl.previousElementSibling,
      ArrowRight: hoverEl.nextElementSibling,
    };
    if (e.key in nav || e.key === "Enter") {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === "Enter") commitPick(hoverEl);
      else if (nav[e.key]) setHover(nav[e.key]);
    }
  }

  function commitPick(el) {
    if (!(el instanceof Element) || B.isOwnNode(el) || el === document.documentElement) return;
    const p = picking;
    if (!p.multi) stopPick();
    p.onPick(el);
    if (p.multi) setHover(null);
  }

  function setHover(el) {
    if (el === hoverEl) return;
    hoverEl = el;
    showHighlight(el ? [el] : [], picking?.mode === "zap" ? "zap" : "pick", true);
  }

  function showHighlight(targets, tone = "pick", label = false) {
    hl = { targets, tone, label };
    drawHighlight();
  }

  const clearHighlight = () => showHighlight([]);
  const highlightSelector = (sel, tone) => showHighlight(allMatches(sel).slice(0, 80), tone);

  function drawHighlight() {
    if (!ui) return;
    const boxes = [];
    hl.targets.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      boxes.push(
        h("div", {
          class: `hl-box ${hl.tone}`,
          style: `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`,
        }),
      );
      if (i === 0 && hl.label) {
        const below = r.top < 30;
        boxes.push(
          h(
            "div",
            {
              class: `hl-label ${hl.tone}`,
              style: `left:${Math.max(4, Math.min(r.left, innerWidth - 260))}px;top:${below ? Math.min(r.bottom + 6, innerHeight - 28) : r.top - 28}px`,
            },
            describe(el),
          ),
        );
      }
    });
    ui.layer.replaceChildren(...boxes);
  }

  let hlFrame = 0;
  const redrawSoon = () => {
    if (!hl.targets.length || hlFrame) return;
    hlFrame = requestAnimationFrame(() => {
      hlFrame = 0;
      drawHighlight();
    });
  };

  function renderPickBar() {
    if (!ui) return;
    if (!picking) return ui.pickBar.replaceChildren(), ui.pickBar.classList.remove("show");
    const text = {
      rule: "Click an element to inject HTML",
      css: "Click an element to insert its selector",
      zap: "Click elements to hide them",
      reselect: "Click the new target element",
    }[picking.mode];
    ui.pickBar.classList.add("show");
    ui.pickBar.replaceChildren(
      h("div", { class: "pick-text" }, h("span", { class: "pulse" }), h("b", null, text), h("small", null, "↑ ↓ ← → to adjust · Enter to choose · Esc to stop")),
      btn("text", null, picking.multi ? "Done" : "Cancel", stopPick),
    );
  }

  // ---------------------------------------------------------------- shell

  function build() {
    host = document.createElement("boosts-ui");
    host.style.cssText =
      "all:initial;position:fixed;inset:0 auto auto 0;width:0;height:0;z-index:2147483647;visibility:hidden;";
    shadow = host.attachShadow({ mode: "closed" });

    ui = {};
    ui.layer = h("div", { class: "hl-layer" });
    ui.name = h("input", {
      class: "name",
      spellcheck: "false",
      "aria-label": "Boost name",
      oninput: () => edit((b) => (b.name = ui.name.value || "Untitled boost")),
      onkeydown: (e) => e.key === "Enter" && ui.name.blur(),
    });
    ui.switcher = h("button", { class: "switcher", type: "button", onclick: () => (menu ? closeMenu() : openMenu()) });
    ui.enabled = h("button", {
      class: "switch",
      type: "button",
      role: "switch",
      title: "Turn this boost on or off",
      onclick: () => edit((b) => (b.enabled = !b.enabled), { rerender: true }),
    }, h("span", { class: "knob" }));
    ui.header = h(
      "header",
      { class: "header" },
      h("div", { class: "brand" }, icon("bolt")),
      h("div", { class: "titles" }, ui.name, ui.switcher),
      ui.enabled,
      iconBtn("minimize", "Minimize", () => setMinimized(true)),
      iconBtn("close", "Close (Alt+B)", hide),
    );
    ui.scope = h("div", { class: "scope" });
    ui.tabs = h("nav", { class: "tabs", role: "tablist" });
    ui.pickBar = h("div", { class: "pick-bar" });
    ui.body = h("div", { class: "body" });
    ui.statusDot = h("span", { class: "status-dot" });
    ui.status = h("span", { class: "status-text" });
    ui.toast = h("div", { class: "toast", role: "status" });
    ui.panel = h(
      "section",
      { class: "panel", "aria-label": "Boosts" },
      ui.header,
      ui.scope,
      ui.tabs,
      ui.pickBar,
      ui.body,
      h(
        "footer",
        { class: "footer" },
        ui.statusDot,
        ui.status,
        h("span", { class: "grow" }),
        btn("text small", "layers", "All boosts", () => chrome.runtime.sendMessage({ type: "openManager" })),
      ),
      ui.toast,
      h("div", { class: "resize", title: "Resize", onpointerdown: startResize }),
    );
    ui.fab = h("button", { class: "fab", type: "button", title: "Open Boosts", onclick: () => setMinimized(false) }, icon("bolt"));

    shadow.append(ui.layer, ui.panel, ui.fab);
    // Keep keystrokes typed into the panel away from the page's shortcut handlers.
    for (const t of ["keydown", "keyup", "keypress"]) shadow.addEventListener(t, (e) => e.stopPropagation());
    shadow.addEventListener("pointerdown", (e) => {
      if (menu && !e.composedPath().some((n) => n === menu || n === ui.switcher)) closeMenu();
    });
    ui.header.addEventListener("pointerdown", startDrag);
    addEventListener("scroll", redrawSoon, { capture: true, passive: true });
    addEventListener("resize", () => {
      applyGeometry();
      redrawSoon();
    });

    loadStyles();
    document.documentElement.append(host);
  }

  async function loadStyles() {
    const texts = await Promise.all(
      ["styles/tokens.css", "styles/panel.css"].map((p) => fetch(chrome.runtime.getURL(p)).then((r) => r.text())),
    );
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(texts.join("\n"));
    shadow.adoptedStyleSheets = [sheet];
    host.style.visibility = "visible";
  }

  function applyGeometry() {
    if (!ui) return;
    const w = Math.min(Math.max(prefs.w, 340), innerWidth - 16);
    const hgt = Math.min(Math.max(prefs.h, 360), innerHeight - 16);
    prefs.x ??= innerWidth - w - 16;
    prefs.y ??= 16;
    prefs.x = Math.min(Math.max(prefs.x, 8), innerWidth - w - 8);
    prefs.y = Math.min(Math.max(prefs.y, 8), innerHeight - 48);
    Object.assign(ui.panel.style, { left: `${prefs.x}px`, top: `${prefs.y}px`, width: `${w}px`, height: `${Math.min(hgt, innerHeight - prefs.y - 8)}px` });
    Object.assign(ui.fab.style, { left: `${prefs.x + w - 52}px`, top: `${prefs.y}px` });
  }

  function savePrefs() {
    clearTimeout(prefsTimer);
    prefsTimer = setTimeout(() => chrome.storage.local.set({ boostsUi: prefs }), 300);
  }

  function startDrag(e) {
    if (e.button !== 0 || e.target.closest("button, input")) return;
    e.preventDefault();
    const sx = e.clientX - prefs.x;
    const sy = e.clientY - prefs.y;
    ui.header.setPointerCapture(e.pointerId);
    ui.panel.classList.add("dragging");
    const move = (ev) => {
      prefs.x = ev.clientX - sx;
      prefs.y = ev.clientY - sy;
      applyGeometry();
    };
    const up = () => {
      ui.header.removeEventListener("pointermove", move);
      ui.panel.classList.remove("dragging");
      savePrefs();
    };
    ui.header.addEventListener("pointermove", move);
    ui.header.addEventListener("pointerup", up, { once: true });
    ui.header.addEventListener("pointercancel", up, { once: true });
  }

  function startResize(e) {
    e.preventDefault();
    const handle = e.currentTarget;
    const sx = e.clientX - prefs.w;
    const sy = e.clientY - prefs.h;
    handle.setPointerCapture(e.pointerId);
    const move = (ev) => {
      prefs.w = ev.clientX - sx;
      prefs.h = ev.clientY - sy;
      applyGeometry();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener(
      "pointerup",
      () => {
        handle.removeEventListener("pointermove", move);
        prefs.w = parseFloat(ui.panel.style.width);
        prefs.h = parseFloat(ui.panel.style.height);
        savePrefs();
      },
      { once: true },
    );
  }

  async function show() {
    if (!host) {
      const { boostsUi } = await chrome.storage.local.get("boostsUi");
      Object.assign(prefs, boostsUi, { minimized: false });
      build();
    }
    open = true;
    host.style.display = "";
    ensureBoost();
    render();
    setMinimized(false);
    chrome.runtime.sendMessage({ type: "status" }).then((s) => {
      if (userScriptsOk === s?.userScripts) return;
      userScriptsOk = !!s?.userScripts;
      if (prefs.tab === "js") renderBody();
    }).catch(() => {});
  }

  function hide() {
    stopPick();
    closeMenu();
    B.flush();
    open = false;
    host.style.display = "none";
  }

  function setMinimized(min) {
    prefs.minimized = min;
    if (min) stopPick();
    ui.panel.classList.toggle("hidden", min);
    ui.fab.classList.toggle("show", min);
    applyGeometry();
  }

  function toast(text, actionLabel, action) {
    clearTimeout(toastTimer);
    ui.toast.replaceChildren(h("span", null, text));
    if (actionLabel)
      ui.toast.append(
        btn("text inverse", null, actionLabel, () => {
          ui.toast.classList.remove("show");
          action();
        }),
      );
    ui.toast.classList.add("show");
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), actionLabel ? 6000 : 2200);
  }

  // ---------------------------------------------------------------- menu

  function openMenu() {
    const list = B.forPage();
    if (draft && !list.includes(boost)) list.push(boost);
    const item = (iconName, label, onclick, cls = "") =>
      h("button", { class: `menu-item ${cls}`, type: "button", role: "menuitem", onclick }, icon(iconName), h("span", { class: "mi-label" }, label));
    menu = h(
      "div",
      { class: "menu", role: "menu", onkeydown: menuKeys },
      h("div", { class: "menu-heading" }, `Boosts on ${location.host}`),
      list.map((b) =>
        h(
          "button",
          { class: `menu-item${b === boost ? " active" : ""}`, type: "button", role: "menuitemradio", "aria-checked": String(b === boost), onclick: () => switchBoost(b) },
          h("span", { class: `dot${b.enabled ? " on" : ""}` }),
          h("span", { class: "mi-label" }, b.name),
          h("span", { class: "mi-meta" }, b.scope === "page" ? "Page" : "Site"),
          b === boost ? icon("check", "mi-check") : null,
        ),
      ),
      h("div", { class: "menu-sep" }),
      item("add", "New boost", newBoost),
      item("delete", "Delete this boost", deleteBoost, "danger"),
      item("layers", "Manage all boosts", () => {
        closeMenu();
        chrome.runtime.sendMessage({ type: "openManager" });
      }),
    );
    ui.panel.append(menu);
    ui.switcher.setAttribute("aria-expanded", "true");
    menu.querySelector(".menu-item")?.focus();
  }

  function menuKeys(e) {
    const items = [...menu.querySelectorAll(".menu-item")];
    const i = items.indexOf(shadow.activeElement);
    if (e.key === "Escape") closeMenu(), ui.switcher.focus();
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
  }

  function closeMenu() {
    menu?.remove();
    menu = null;
    ui?.switcher.setAttribute("aria-expanded", "false");
  }

  // ---------------------------------------------------------------- render

  function render() {
    if (!ui) return;
    closeMenu();
    ui.name.value = boost.name;
    ui.switcher.replaceChildren(
      h("span", null, `${boost.host}${boost.scope === "page" ? B.normPath(boost.path) : ""}`),
      icon("expand"),
    );
    ui.switcher.title = "Switch, add or delete boosts for this site";
    ui.enabled.setAttribute("aria-checked", String(boost.enabled));
    ui.panel.classList.toggle("disabled", !boost.enabled);
    renderScope();
    renderTabs();
    renderBody();
    renderPickBar();
    setStatus("Saved");
  }

  function renderScope() {
    const seg = (scope, label, detail) =>
      h(
        "button",
        {
          class: `seg${boost.scope === scope ? " on" : ""}`,
          type: "button",
          "aria-pressed": String(boost.scope === scope),
          onclick: () =>
            boost.scope !== scope &&
            edit(
              (b) => {
                b.scope = scope;
                b.path = B.normPath(location.pathname);
              },
              { rerender: true },
            ),
        },
        h("b", null, label),
        h("span", null, detail),
      );
    ui.scope.replaceChildren(
      h("span", { class: "scope-label" }, "Applies to"),
      h("div", { class: "segmented" }, seg("site", "Whole site", location.host), seg("page", "This page", B.normPath(location.pathname))),
    );
  }

  function renderTabs() {
    const counts = { elements: boost.rules.length, zap: boost.zaps.length, css: boost.css.trim() ? "•" : 0, js: boost.js.trim() ? "•" : 0 };
    ui.tabs.replaceChildren(
      ...TABS.map(([id, label, ic]) =>
        h(
          "button",
          {
            class: `tab${prefs.tab === id ? " on" : ""}`,
            type: "button",
            role: "tab",
            "aria-selected": String(prefs.tab === id),
            onclick: () => {
              if (prefs.tab === id) return;
              prefs.tab = id;
              savePrefs();
              stopPick();
              renderTabs();
              renderBody();
            },
          },
          icon(ic),
          h("span", null, label),
          counts[id] ? h("span", { class: "tab-count" }, counts[id]) : null,
        ),
      ),
    );
  }

  function renderBody() {
    counters.clear();
    clearHighlight();
    const views = { elements: viewElements, css: viewCss, js: viewJs, zap: viewZap };
    ui.body.className = `body ${prefs.tab === "css" || prefs.tab === "js" ? "fill" : ""}`;
    ui.body.replaceChildren(...[views[prefs.tab]()].flat().filter(Boolean));
  }

  function refreshCounts() {
    for (const fn of counters.values()) fn();
  }

  // ---- Elements

  function viewElements() {
    const pick = () => startPick({ mode: "rule", onPick: addRule });
    if (!boost.rules.length) {
      return h(
        "div",
        { class: "empty" },
        h("div", { class: "empty-icon" }, icon("target")),
        h("h3", null, "Inject HTML anywhere"),
        h("p", null, "Pick an element, then add markup before, inside or after it — or replace it entirely. Attach a script to make it interactive."),
        btn("filled", "target", "Select element", pick),
        h("small", null, "Tip: right-click anything → “Boost this element”"),
      );
    }
    return [
      h("div", { class: "toolbar" }, btn("tonal", "target", "Select element", pick), h("span", { class: "grow" }), h("span", { class: "hint" }, `${boost.rules.length} injection${boost.rules.length === 1 ? "" : "s"}`)),
      h("div", { class: "cards" }, boost.rules.map(ruleCard)),
    ];
  }

  function addRule(el) {
    const r = { id: B.uid(), selector: cssPath(el), position: "after", html: "", js: "" };
    prefs.tab = "elements";
    expanded = r.id;
    edit((b) => b.rules.push(r), { rerender: true });
    ui.body.querySelector(".rule.open .ed-input")?.focus();
  }

  function ruleCard(r) {
    const isOpen = expanded === r.id;
    const count = h("span", { class: "count" });
    const chip = h("span", { class: "chip" }, POSITIONS.find(([p]) => p === r.position)?.[1] || "After");
    const sel = h("code", { class: "sel" }, r.selector || "No selector");
    const detailCount = h("span", { class: "match" });
    counters.set(r.id, () => {
      const { count: n, error } = B.ruleInfo(boost.id, r.id);
      count.textContent = error ? "!" : String(n);
      count.className = `count${error ? " err" : n ? "" : " zero"}`;
      count.title = error || `${n} matching element${n === 1 ? "" : "s"}`;
      detailCount.textContent = error ? error : boost.enabled ? `Matches ${n} element${n === 1 ? "" : "s"}` : "Boost is off";
      detailCount.className = `match${error || !n ? " warn" : ""}`;
      sel.textContent = r.selector || "No selector";
    });
    const card = h(
      "div",
      {
        class: `card rule${isOpen ? " open" : ""}`,
        onmouseenter: () => !picking && highlightSelector(r.selector),
        onmouseleave: () => !picking && clearHighlight(),
      },
      h(
        "button",
        {
          class: "card-head",
          type: "button",
          "aria-expanded": String(isOpen),
          onclick: () => {
            expanded = isOpen ? null : r.id;
            renderBody();
            if (!isOpen) highlightSelector(r.selector);
          },
        },
        chip,
        sel,
        count,
        icon("expand", "chev"),
      ),
      isOpen && ruleDetail(r, chip, detailCount),
    );
    counters.get(r.id)();
    return card;
  }

  function ruleDetail(r, chip, detailCount) {
    const selInput = h("input", {
      class: "field mono",
      value: r.selector,
      spellcheck: "false",
      "aria-label": "CSS selector",
      oninput: () => setSelector(selInput.value, false),
    });
    const setSelector = (v, updateInput = true) => {
      if (updateInput) selInput.value = v;
      edit(() => (r.selector = v.trim()));
      highlightSelector(r.selector);
    };
    const walk = (fn) => {
      const el = firstMatch(r.selector);
      const next = el && fn(el);
      if (next && next !== document.documentElement) setSelector(cssPath(next));
      else toast("No element in that direction");
    };
    const posSeg = h(
      "div",
      { class: "segmented small" },
      POSITIONS.map(([p, label]) =>
        h(
          "button",
          {
            class: `seg${r.position === p ? " on" : ""}`,
            type: "button",
            title: { before: "Insert before the element", prepend: "Insert inside, at the start", append: "Insert inside, at the end", after: "Insert after the element", replace: "Hide the element and insert in its place" }[p],
            onclick: (e) => {
              edit(() => (r.position = p));
              chip.textContent = label;
              for (const s of posSeg.children) s.classList.toggle("on", s === e.currentTarget);
            },
          },
          label,
        ),
      ),
    );
    const html = createEditor({
      lang: "html",
      value: r.html,
      grow: true,
      placeholder: '<div class="note">Hello from Boosts 👋</div>',
      onChange: (v) => edit(() => (r.html = v)),
    });
    const runRule = () => {
      B.flush();
      B.rerunRule(boost.id, r.id);
      if (!userScriptsOk) toast("Running via <script> — may be blocked by this site’s CSP");
    };
    const js = createEditor({
      lang: "js",
      value: r.js,
      grow: true,
      minLines: 3,
      placeholder: "// `el` is the matched element, `nodes` your inserted nodes\nnodes[0]?.addEventListener('click', () => el.remove());",
      onChange: (v) => edit(() => (r.js = v)),
      onRun: runRule,
    });
    return h(
      "div",
      { class: "card-body" },
      h(
        "div",
        { class: "group" },
        h("label", { class: "label" }, "Target"),
        selInput,
        h(
          "div",
          { class: "row" },
          detailCount,
          h("span", { class: "grow" }),
          iconBtn("up", "Select parent", () => walk((el) => el.parentElement), "small"),
          iconBtn("down", "Select first child", () => walk((el) => [...el.children].find((c) => !B.isOwnNode(c))), "small"),
          btn("text small", null, "All similar", () => setSelector(r.selector.replace(/:nth-child\(\d+\)(?=[^>]*$)/, ""))),
          iconBtn("target", "Pick a different element", () => startPick({ mode: "reselect", onPick: (el) => setSelector(cssPath(el)) }), "small"),
        ),
      ),
      h("div", { class: "group" }, h("label", { class: "label" }, "Insert"), posSeg),
      h("div", { class: "group" }, h("div", { class: "row" }, h("label", { class: "label" }, "HTML"), h("span", { class: "grow" }), formatBtn(html)), html.el),
      h(
        "div",
        { class: "group" },
        h("div", { class: "row" }, h("label", { class: "label" }, "Script"), h("span", { class: "grow" }), formatBtn(js), btn("text small", "play", "Re-apply", runRule, { title: "Re-insert HTML and run the script (Ctrl+Enter)" })),
        js.el,
      ),
      h(
        "div",
        { class: "row end" },
        btn("text small danger", "delete", "Remove injection", () => {
          expanded = null;
          edit((b) => (b.rules = b.rules.filter((x) => x !== r)), { rerender: true });
          clearHighlight();
        }),
      ),
    );
  }

  // ---- CSS

  function viewCss() {
    const ed = createEditor({
      lang: "css",
      value: boost.css,
      placeholder: "/* Applied live to this site */\nbody {\n  font-family: system-ui, sans-serif;\n}",
      onChange: (v) => edit((b) => (b.css = v)),
    });
    return [
      h(
        "div",
        { class: "toolbar" },
        btn("tonal", "target", "Pick selector", () =>
          startPick({
            mode: "css",
            onPick: (el) => {
              const v = ed.value;
              const lead = v && !v.endsWith("\n") ? "\n\n" : v ? "\n" : "";
              ed.ta.setSelectionRange(v.length, v.length);
              ed.insert(`${lead}${cssPath(el)} {\n  \n}\n`, 3);
            },
          }),
        ),
        h("span", { class: "grow" }),
        h("span", { class: "hint" }, h("span", { class: "live-dot" }), "Live"),
        formatBtn(ed),
      ),
      ed.el,
    ];
  }

  // ---- Script

  function viewJs() {
    const run = async () => {
      B.flush();
      const res = await B.runPageJs(boost.id);
      toast(res?.ok ? "Script ran — check the console for output" : "Blocked by this site’s CSP — allow user scripts");
    };
    const ed = createEditor({
      lang: "js",
      value: boost.js,
      placeholder: "// Runs in the page once it has loaded\nconsole.log('Boosted', location.host);",
      onChange: (v) => edit((b) => (b.js = v)),
      onRun: run,
    });
    return [
      !userScriptsOk &&
        h(
          "div",
          { class: "banner" },
          icon("warn"),
          h("div", null, h("b", null, "Allow user scripts for full power"), h("p", null, "Without it, scripts can’t run on sites with a strict Content Security Policy. Turn on “Allow User Scripts” on the extension’s details page.")),
          btn("text small", "openNew", "Open", () => chrome.runtime.sendMessage({ type: "openExtensionSettings" })),
        ),
      h("div", { class: "toolbar" }, btn("tonal", "play", "Run now", run), h("span", { class: "grow" }), h("span", { class: "hint" }, "Runs on every load · Ctrl+Enter"), formatBtn(ed)),
      ed.el,
    ];
  }

  // ---- Zap

  function viewZap() {
    const zapping = picking?.mode === "zap";
    const list = boost.zaps.map((z) =>
      h(
        "div",
        { class: "zap-row" },
        icon("eyeOff", "muted"),
        h("code", { class: "sel", title: z.selector }, z.selector),
        iconBtn("eye", "Show again", () => edit((b) => (b.zaps = b.zaps.filter((x) => x !== z)), { rerender: true }), "small"),
      ),
    );
    return [
      boost.zaps.length
        ? h("div", { class: "toolbar" }, btn(zapping ? "filled danger" : "tonal", "eyeOff", zapping ? "Done zapping" : "Zap elements", () => (zapping ? stopPick() : startZap())), h("span", { class: "grow" }), btn("text small", null, "Restore all", () => edit((b) => (b.zaps = []), { rerender: true })))
        : h(
            "div",
            { class: "empty" },
            h("div", { class: "empty-icon zap" }, icon("eyeOff")),
            h("h3", null, "Zap distractions"),
            h("p", null, "Click banners, popups, sidebars — anything you never want to see on this site again. They stay hidden every time you visit."),
            btn(zapping ? "filled danger" : "filled", "eyeOff", zapping ? "Done zapping" : "Zap elements", () => (zapping ? stopPick() : startZap())),
          ),
      list.length ? h("div", { class: "zap-list" }, list) : null,
    ];
  }

  function startZap() {
    startPick({
      mode: "zap",
      multi: true,
      onPick: (el) => {
        const selector = cssPath(el);
        if (!boost.zaps.some((z) => z.selector === selector)) edit((b) => b.zaps.push({ id: B.uid(), selector }));
        renderTabs();
        renderBody();
      },
    });
    renderBody();
  }

  // ---------------------------------------------------------------- entry points

  B.ui = {
    async handle(type) {
      if (type === "toggle") {
        if (open && !prefs.minimized) return hide();
        return show();
      }
      const target = B.lastContextTarget;
      await show();
      if (!target?.isConnected || B.isOwnNode(target)) return;
      if (type === "pickContext") addRule(target);
      if (type === "zapContext") {
        prefs.tab = "zap";
        const selector = cssPath(target);
        edit((b) => b.zaps.push({ id: B.uid(), selector }), { rerender: true });
      }
    },
  };

  B.on((type) => {
    if (!open) return;
    if (type === "nav" || (boost && !B.get(boost.id) && !draft)) {
      ensureBoost();
      return render();
    }
    // Another tab or the manager changed a boost: pick up the fresh copy.
    const fresh = boost && B.get(boost.id);
    if (fresh && fresh !== boost) {
      boost = fresh;
      render();
    } else {
      refreshCounts();
    }
  });
})();
