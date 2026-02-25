function getHostnameFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function readStorage() {
  const data = await chrome.storage.local.get("siteStyles");
  return data.siteStyles || {};
}

async function writeStorage(siteStyles) {
  await chrome.storage.local.set({ siteStyles });
}

async function sendApplyToTab(tabId, css) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "APPLY_CSS", css });
  } catch (error) {
    // If the content script is not ready, retry a few times
    if (error.message && error.message.includes("Receiving end does not exist")) {
      let retries = 3;
      while (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
        try {
          await chrome.tabs.sendMessage(tabId, { type: "APPLY_CSS", css });
          break;
        } catch (retryError) {
          retries--;
        }
      }
    }
  }
}

(async function init() {
  const editorEl = document.getElementById("editor");
  const saveBtn = document.getElementById("save");
  const applyBtn = document.getElementById("apply");
  const clearBtn = document.getElementById("clear");

  const tab = await getActiveTab();
  const hostname = getHostnameFromUrl(tab?.url || "");

  // Initialize CodeMirror editor
  const editor = CodeMirror(editorEl, {
    mode: 'css',
    theme: 'monokai',
    lineNumbers: true,
    lineWrapping: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    autofocus: true,
    extraKeys: {
      'Tab': 'indentMore',
      'Shift-Tab': 'indentLess'
    }
  });

  if (!hostname || !tab?.id) {
    editor.setOption('readOnly', true);
    saveBtn.disabled = true;
    applyBtn.disabled = true;
    clearBtn.disabled = true;
    return;
  }

  const siteStyles = await readStorage();
  const entry = siteStyles[hostname] || { css: "" };

  editor.setValue(entry.css || "");

  saveBtn.addEventListener("click", async () => {
    const updated = await readStorage();
    const cssValue = editor.getValue();
    updated[hostname] = {
      css: cssValue
    };
    await writeStorage(updated);

    // Apply immediately after saving as well
    await sendApplyToTab(tab.id, cssValue);
    window.close();
  });

  applyBtn.addEventListener("click", async () => {
    // Only apply to the current tab (without changing storage)
    const cssValue = editor.getValue();
    await sendApplyToTab(tab.id, cssValue);
  });

  clearBtn.addEventListener("click", async () => {
    const updated = await readStorage();
    delete updated[hostname];
    await writeStorage(updated);
    editor.setValue("");
    await sendApplyToTab(tab.id, "");
    window.close();
  });
})();
