const STYLE_ID = "simple-css-override-style";

function upsertStyle(cssText) {
  // Remove previous style (if it exists)
  let styleEl = document.getElementById(STYLE_ID);
  if (!cssText || !cssText.trim()) {
    if (styleEl) styleEl.remove();
    return;
  }

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    // Append early so styles apply as soon as possible
    (document.documentElement || document.head || document).appendChild(styleEl);
  }
  styleEl.textContent = cssText;
}


function getHostname() {
  // For some special pages like chrome:// or about:, access may not be available
  try {
    return location.hostname || "";
  } catch {
    return "";
  }
}

async function loadAndApply() {
  const hostname = getHostname();
  if (!hostname) return;

  const data = await chrome.storage.local.get("siteStyles");
  const siteStyles = data.siteStyles || {};
  const entry = siteStyles[hostname];

  if (entry?.css) {
    upsertStyle(entry.css);
  } else {
    upsertStyle("");
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "APPLY_CSS") {
    upsertStyle(msg.css || "");
    sendResponse({ ok: true });
    return true;
  }
});

// Automatically apply on load
loadAndApply();
