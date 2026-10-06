// Boosts service worker: toggles the in-page panel, runs boost JavaScript in the
// page's main world, and keeps the per-tab badge in sync.

const CONTENT_FILES = ["src/core.js", "src/ui.js"];

function userScriptsEnabled() {
  // Since Chrome 138 the API exists but throws until "Allow User Scripts" is on.
  try {
    chrome.userScripts.getScripts();
    return true;
  } catch {
    return false;
  }
}

async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
  } catch {
    // Tab was open before the extension loaded: inject the content scripts, retry.
    await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: CONTENT_FILES });
    return chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
  }
}

async function runInPage(tabId, code) {
  if (userScriptsEnabled()) {
    await chrome.userScripts.execute({
      target: { tabId, frameIds: [0] },
      js: [{ code }],
      world: "MAIN",
      injectImmediately: true,
    });
    return { ok: true, via: "userScripts" };
  }
  // Fallback: a <script> element in the main world. Blocked on pages with a strict CSP.
  const [res] = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] },
    world: "MAIN",
    args: [code],
    func: (src) => {
      // Inline scripts run synchronously on insert, so a probe attribute the
      // script clears tells us whether the page's CSP let it through.
      const root = document.documentElement;
      root.setAttribute("data-boost-probe", "");
      const s = document.createElement("script");
      s.textContent = `document.documentElement.removeAttribute("data-boost-probe");\n${src}`;
      (document.head || root).append(s);
      s.remove();
      const ran = !root.hasAttribute("data-boost-probe");
      root.removeAttribute("data-boost-probe");
      return ran;
    },
  });
  return { ok: res?.result !== false, via: "script-tag" };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "boost-element", title: "Boost this element", contexts: ["all"] });
  chrome.contextMenus.create({ id: "zap-element", title: "Zap this element", contexts: ["all"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  const action = info.menuItemId === "zap-element" ? "zapContext" : "pickContext";
  sendToTab(tab.id, { type: action }).catch(() => {});
});

async function togglePanel(tab) {
  if (!tab?.id) return;
  try {
    await sendToTab(tab.id, { type: "toggle" });
  } catch {
    // New Tab, chrome:// pages and the Web Store can't be scripted by any extension.
    chrome.action.setBadgeText({ tabId: tab.id, text: "✕" });
    chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#b3261e" });
    chrome.action.setTitle({ tabId: tab.id, title: "Boosts can't run on this page" });
    setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: "" }).catch(() => {}), 2500);
  }
}

chrome.action.onClicked.addListener(togglePanel);

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "toggle-panel") return;
  togglePanel(tab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  switch (msg.type) {
    case "exec":
      if (!tabId) return;
      runInPage(tabId, msg.code)
        .then(sendResponse)
        .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));
      return true;
    case "badge":
      if (!tabId) return;
      chrome.action.setBadgeText({ tabId, text: msg.count ? String(msg.count) : "" });
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#0b57d0" });
      chrome.action.setBadgeTextColor?.({ tabId, color: "#ffffff" });
      return;
    case "status":
      sendResponse({ userScripts: userScriptsEnabled() });
      return;
    case "openExtensionSettings":
      chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
      return;
    case "openManager":
      chrome.runtime.openOptionsPage();
      return;
  }
});
