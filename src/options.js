// Boosts manager: lists every saved boost, grouped by site, with toggle,
// delete and JSON import/export.

const PREFIX = "boost:";
const $ = (s) => document.querySelector(s);
let boosts = [];
let query = "";
let toastTimer;

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}

function toast(text) {
  clearTimeout(toastTimer);
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2400);
}

const ago = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "just now";
  for (const [n, u] of [[86400 * 30, "mo"], [86400, "d"], [3600, "h"], [60, "m"]]) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
};

async function load() {
  const items = await chrome.storage.local.get(null);
  boosts = Object.entries(items)
    .filter(([k]) => k.startsWith(PREFIX))
    .map(([, v]) => v);
  render();
}

function save(b) {
  b.updatedAt = Date.now();
  return chrome.storage.local.set({ [PREFIX + b.id]: b });
}

function summary(b) {
  const tags = [];
  if (b.rules?.length) tags.push(`${b.rules.length} injection${b.rules.length === 1 ? "" : "s"}`);
  const lines = (src) => {
    const n = src.trim().split("\n").length;
    return `${n} line${n === 1 ? "" : "s"}`;
  };
  if (b.css?.trim()) tags.push(`CSS · ${lines(b.css)}`);
  if (b.js?.trim()) tags.push(`Script · ${lines(b.js)}`);
  if (b.zaps?.length) tags.push(`${b.zaps.length} zapped`);
  return tags.length ? tags : ["Empty"];
}

function render() {
  const q = query.toLowerCase();
  const shown = boosts.filter((b) => !q || `${b.name} ${b.host} ${b.path}`.toLowerCase().includes(q));
  const bySite = Map.groupBy(shown, (b) => b.host);
  const list = $("#list");
  if (!boosts.length) {
    list.replaceChildren(
      h("div", { class: "empty" }, h("h2", null, "No boosts yet"), h("p", null, "Open any site and press ", h("kbd", null, "Alt+B"), " or click the toolbar icon to start customizing it.")),
    );
    return;
  }
  if (!shown.length) {
    list.replaceChildren(h("div", { class: "empty" }, h("p", null, `Nothing matches “${query}”.`)));
    return;
  }
  list.replaceChildren(
    ...[...bySite]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([site, items]) =>
        h(
          "section",
          { class: "site" },
          h(
            "div",
            { class: "site-head" },
            h("img", { src: chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(`https://${site}`)}&size=32`), alt: "" }),
            h("h2", null, site),
            h("a", { href: `https://${site}`, target: "_blank", rel: "noopener" }, "Open ↗"),
          ),
          items.sort((a, b) => a.createdAt - b.createdAt).map(row),
        ),
      ),
  );
}

function row(b) {
  return h(
    "div",
    { class: "boost" },
    h(
      "button",
      {
        class: "switch",
        type: "button",
        role: "switch",
        "aria-checked": String(b.enabled),
        "aria-label": `Enable ${b.name}`,
        onclick: async () => {
          b.enabled = !b.enabled;
          await save(b);
          render();
        },
      },
    ),
    h(
      "div",
      { class: "boost-main" },
      h("div", { class: "boost-name" }, b.name),
      h(
        "div",
        { class: "boost-meta" },
        h("span", { class: "tag scope" }, b.scope === "page" ? `Page · ${b.path}` : "Whole site"),
        summary(b).map((t) => h("span", { class: "tag" }, t)),
      ),
    ),
    h("span", { class: "when" }, `Edited ${ago(b.updatedAt)}`),
    h(
      "button",
      {
        class: "btn text danger",
        type: "button",
        onclick: async () => {
          if (!confirm(`Delete “${b.name}” on ${b.host}?`)) return;
          await chrome.storage.local.remove(PREFIX + b.id);
          toast("Boost deleted");
        },
      },
      "Delete",
    ),
  );
}

$("#search").addEventListener("input", (e) => {
  query = e.target.value.trim();
  render();
});

$("#export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ app: "boosts", version: 1, boosts }, null, 2)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: `boosts-${new Date().toISOString().slice(0, 10)}.json` });
  a.click();
  URL.revokeObjectURL(a.href);
});

$("#import").addEventListener("click", () => $("#file").click());
$("#file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const list = (Array.isArray(data) ? data : data.boosts || []).filter((b) => b?.id && b.host);
    const now = Date.now();
    await chrome.storage.local.set(
      Object.fromEntries(list.map((b) => [PREFIX + b.id, { rules: [], zaps: [], css: "", js: "", scope: "site", enabled: true, createdAt: now, ...b, updatedAt: now }])),
    );
    toast(`Imported ${list.length} boost${list.length === 1 ? "" : "s"}`);
  } catch {
    toast("That file isn't a Boosts export");
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && Object.keys(changes).some((k) => k.startsWith(PREFIX))) load();
});

load();
