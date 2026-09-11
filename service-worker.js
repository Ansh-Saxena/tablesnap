/**
 * TableSnap Service Worker (Manifest V3)
 * Handles lifecycle, badge updates, and message routing.
 */

// Initialize defaults on extension install / update
chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.local.get(['tablesnap_installed_at', 'tablesnap_daily_usage']);
  if (!existing.tablesnap_installed_at) {
    const today = new Date().toISOString().slice(0, 10);
    await chrome.storage.local.set({
      tablesnap_installed_at: Date.now(),
      tablesnap_is_pro: false,
      tablesnap_sandbox_pro: false,
      tablesnap_daily_usage: { date: today, count: 0 }
    });
  }

  // Set action badge style
  await chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === 'UPDATE_BADGE') {
        const count = message.count || 0;
        const text = count > 0 ? String(count) : '';
        if (sender.tab && sender.tab.id) {
          await chrome.action.setBadgeText({ text, tabId: sender.tab.id });
        }
        sendResponse({ success: true });
        return;
      }

      if (message.action === 'GET_TAB_INFO') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        sendResponse({ success: true, tab });
        return;
      }

      sendResponse({ success: true, received: true });
    } catch (err) {
      console.error('Service worker error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep channel open for async response
});
