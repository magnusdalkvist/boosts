// Boosts core: loads boosts from storage and applies the ones matching this page.
// Runs at document_start in every top-level page; CSS lands before first paint,
// HTML injections and scripts once the DOM is parsed. The panel (ui.js) drives
// edits through the `__boosts` API exposed here.

(() => {
  if (window.top !== window || globalThis.__boosts) return;

  const B = (globalThis.__boosts = {});
  const PREFIX = "boost:";
  const SAVE_DELAY = 350;

  /** id -> boost, as stored (or as last edited in this tab). */
  const all = new Map();
  /** id -> { boost, sheet, css, rules: Map(ruleId -> ruleState), jsRan } for applied boosts. */
  const active = new Map();
  const listeners = new Set();
  const pendingSaves = new Map();

  let domReady = false;
  let href = location.href;
  let lastBadge = -1;
  let ttPolicy;

  // ---------------------------------------------------------------- helpers

  B.uid = () => Math.random().toString(36).slice(2, 10);

  const normPath = (p) => (p && p.length > 1 ? p.replace(/\/+$/, "") : "/");
  B.normPath = normPath;

  B.matches = (b, loc = location) =>
    b.host === loc.host && (b.scope !== "page" || normPath(b.path) === normPath(loc.pathname));

  B.on = (fn) => (listeners.add(fn), () => listeners.delete(fn));
  const emit = (type) => listeners.forEach((fn) => fn(type));

  B.isOwnNode = (n) => !!(n instanceof Element && (n.closest("[data-boost-node]") || n.localName === "boosts-ui"));

  B.exec = (code) =>
    chrome.runtime.sendMessage({ type: "exec", code }).catch((e) => ({ ok: false, error: String(e?.message || e) }));

  function parseHtml(html) {
    const tpl = document.createElement("template");
    try {
      tpl.innerHTML = html;
    } catch {
      // Trusted Types page: route the markup through our own policy.
      ttPolicy ??= trustedTypes.createPolicy("boosts#html", { createHTML: (s) => s });
      tpl.innerHTML = ttPolicy.createHTML(html);
    }
    return tpl.content;
  }

  function buildCss(b) {
    const zaps = (b.zaps || []).map((z) => `${z.selector} { display: none !important; }`).join("\n");
    // Zaps first: an unclosed block in hand-written CSS would swallow them.
    return `${zaps}\n/* Boost: ${b.name.replace(/\*\//g, "")} */\n${b.css || ""}`;
  }

  // ---------------------------------------------------------------- boosts API

  B.create = (scope = "site") => ({
    id: B.uid(),
    name: location.host.replace(/^www\./, "") || "New boost",
    enabled: true,
    scope,
    host: location.host,
    path: normPath(location.pathname),
    css: "",
    js: "",
    rules: [],
    zaps: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  B.get = (id) => all.get(id);
  B.list = () => [...all.values()];
  B.forPage = () => B.list().filter((b) => B.matches(b)).sort((a, b) => a.createdAt - b.createdAt);

  /** Apply an edited boost right away; persist it shortly after. */
  B.update = (b) => {
    b.updatedAt = Date.now();
    all.set(b.id, b);
    reconcile({ runJs: false });
    clearTimeout(pendingSaves.get(b.id));
    pendingSaves.set(
      b.id,
      setTimeout(() => {
        pendingSaves.delete(b.id);
        chrome.storage.local.set({ [PREFIX + b.id]: b });
      }, SAVE_DELAY),
    );
  };

  B.flush = () => {
    for (const [id, t] of pendingSaves) {
      clearTimeout(t);
      const b = all.get(id);
      if (b) chrome.storage.local.set({ [PREFIX + id]: b });
    }
    pendingSaves.clear();
  };

  B.remove = (id) => {
    clearTimeout(pendingSaves.get(id));
    pendingSaves.delete(id);
    all.delete(id);
    unapply(id);
    chrome.storage.local.remove(PREFIX + id);
    updateBadge();
  };

  B.ruleInfo = (boostId, ruleId) => {
    const rs = active.get(boostId)?.rules.get(ruleId);
    return rs ? { count: rs.count, error: rs.error } : { count: 0, error: null };
  };

  B.runPageJs = (boostId) => {
    const b = all.get(boostId);
    if (!b?.js?.trim()) return Promise.resolve({ ok: true });
    return B.exec(pageJsCode(b));
  };

  /** Re-insert a rule's HTML everywhere and run its element script. */
  B.rerunRule = (boostId, ruleId) => {
    const st = active.get(boostId);
    const rs = st?.rules.get(ruleId);
    if (!rs) return;
    undoRule(rs);
    st.rules.delete(ruleId);
    applyBoost(st.boost, true);
  };

  // ---------------------------------------------------------------- applying

  function reconcile({ runJs }) {
    const want = new Map();
    for (const b of all.values()) if (b.enabled && B.matches(b)) want.set(b.id, b);
    for (const id of [...active.keys()]) if (!want.has(id)) unapply(id);
    for (const b of want.values()) applyBoost(b, runJs);
    updateBadge();
  }

  function applyBoost(b, runJs) {
    let st = active.get(b.id);
    if (!st) active.set(b.id, (st = { rules: new Map(), sheet: new CSSStyleSheet(), css: null, jsRan: false }));
    st.boost = b;

    // Constructed sheets sidestep the page's style-src CSP and cascade after
    // every <style>/<link> in the document.
    const css = buildCss(b);
    if (st.css !== css) st.sheet.replaceSync((st.css = css));
    if (!document.adoptedStyleSheets.includes(st.sheet))
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, st.sheet];

    if (!domReady) return;

    const ids = new Set(b.rules.map((r) => r.id));
    for (const [rid, rs] of st.rules) {
      if (!ids.has(rid)) {
        undoRule(rs);
        st.rules.delete(rid);
      }
    }
    for (const r of b.rules) {
      const sig = `${r.selector}\0${r.position}\0${r.html}`;
      let rs = st.rules.get(r.id);
      if (rs && rs.sig !== sig) {
        undoRule(rs);
        rs = null;
      }
      if (!rs) st.rules.set(r.id, (rs = { sig, apps: new Map(), count: 0, error: null }));
      applyRule(b, r, rs, runJs);
    }

    if (runJs && !st.jsRan) {
      st.jsRan = true;
      if (b.js?.trim()) B.exec(pageJsCode(b));
    }
  }

  function applyRule(b, r, rs, runJs) {
    let targets;
    rs.error = null;
    try {
      targets = r.selector ? document.querySelectorAll(r.selector) : [];
    } catch {
      rs.error = "Invalid selector";
      rs.count = 0;
      return;
    }
    let count = 0;
    for (const t of targets) {
      if (B.isOwnNode(t)) continue;
      count++;
      let app = rs.apps.get(t);
      if (app && app.nodes.every((n) => n.isConnected)) continue;
      if (app) undoApp(app);
      try {
        app = insert(t, r);
      } catch (e) {
        rs.error = String(e?.message || e);
        continue;
      }
      rs.apps.set(t, app);
      if (runJs && r.js?.trim()) B.exec(ruleJsCode(b, r, app.token));
    }
    rs.count = count;
    for (const [t, app] of rs.apps) {
      if (!t.isConnected) {
        undoApp(app);
        rs.apps.delete(t);
      }
    }
  }

  function insert(t, r) {
    const token = B.uid();
    const frag = parseHtml(r.html || "");
    const nodes = [...frag.childNodes];
    for (const n of nodes) if (n.nodeType === 1) n.setAttribute("data-boost-node", token);
    const app = { token, target: t, nodes, prevStyle: undefined };
    switch (r.position) {
      case "before": t.before(frag); break;
      case "after": t.after(frag); break;
      case "prepend": t.prepend(frag); break;
      case "replace":
        app.prevStyle = t.getAttribute("style");
        t.style.setProperty("display", "none", "important");
        t.after(frag);
        break;
      default: t.append(frag);
    }
    t.setAttribute("data-boost-el", `${t.getAttribute("data-boost-el") || ""} ${token}`.trim());
    return app;
  }

  function undoApp(app) {
    for (const n of app.nodes) n.remove();
    const t = app.target;
    if (app.prevStyle !== undefined) {
      if (app.prevStyle === null) t.removeAttribute("style");
      else t.setAttribute("style", app.prevStyle);
    }
    const rest = (t.getAttribute("data-boost-el") || "").split(" ").filter((x) => x && x !== app.token);
    if (rest.length) t.setAttribute("data-boost-el", rest.join(" "));
    else t.removeAttribute("data-boost-el");
  }

  function undoRule(rs) {
    for (const app of rs.apps.values()) undoApp(app);
    rs.apps.clear();
  }

  function unapply(id) {
    const st = active.get(id);
    if (!st) return;
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== st.sheet);
    for (const rs of st.rules.values()) undoRule(rs);
    active.delete(id);
  }

  const label = (b) => JSON.stringify(`[Boosts] ${b.name}`);

  function pageJsCode(b) {
    return `(async function () {\n${b.js}\n})().catch((e) => console.error(${label(b)}, e));`;
  }

  function ruleJsCode(b, r, token) {
    return `(() => {
  const el = document.querySelector('[data-boost-el~="${token}"]');
  const nodes = [...document.querySelectorAll('[data-boost-node="${token}"]')];
  (async function (el, nodes) {\n${r.js}\n  }).call(el, el, nodes).catch((e) => console.error(${label(b)}, e));
})();`;
  }

  function updateBadge() {
    if (active.size === lastBadge) return;
    lastBadge = active.size;
    chrome.runtime.sendMessage({ type: "badge", count: active.size }).catch(() => {});
  }

  // ---------------------------------------------------------------- page lifecycle

  let pass = 0;
  function schedule() {
    if (pass) return;
    pass = setTimeout(() => {
      pass = 0;
      if (location.href !== href) {
        href = location.href;
        reconcile({ runJs: true });
        emit("nav");
      } else if (active.size) {
        for (const st of active.values()) applyBoost(st.boost, true);
      }
    }, 80);
  }

  function onDomReady() {
    domReady = true;
    reconcile({ runJs: true });
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    // Same-document navigations (SPAs) don't always mutate the DOM right away.
    window.navigation?.addEventListener("navigatesuccess", schedule);
    window.addEventListener("popstate", schedule);
  }

  document.addEventListener(
    "contextmenu",
    (e) => {
      const t = e.composedPath().find((n) => n instanceof Element);
      B.lastContextTarget = t || null;
    },
    true,
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    let dirty = false;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (!key.startsWith(PREFIX)) continue;
      const id = key.slice(PREFIX.length);
      const cur = all.get(id);
      if (!newValue) {
        if (cur && !pendingSaves.has(id)) {
          all.delete(id);
          dirty = true;
        }
      } else if (!cur || newValue.updatedAt > cur.updatedAt) {
        all.set(id, newValue);
        dirty = true;
      }
    }
    if (dirty) {
      reconcile({ runJs: false });
      emit("boosts");
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (["toggle", "pickContext", "zapContext"].includes(msg.type)) {
      B.ready.then(() => B.ui?.handle(msg.type));
      sendResponse({ ok: true });
    }
  });

  window.addEventListener("pagehide", () => B.flush());

  B.ready = chrome.storage.local.get(null).then((items) => {
    for (const [k, v] of Object.entries(items)) if (k.startsWith(PREFIX)) all.set(v.id, v);
    // Small pages can finish parsing while storage is still loading.
    if (document.readyState !== "loading") return onDomReady();
    reconcile({ runJs: false }); // CSS only: lands before first paint
    document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
  });
})();
