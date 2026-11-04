// Consent report (fork addition).
// Remembers per tab which CMP Consent-O-Matic handled, so the popup can show it.
// Only listens; never replies, so it does not interfere with background.js.
const key = (tabId) => "comReport_" + tabId;
const session = chrome.storage && chrome.storage.session;

if (session) {
    chrome.runtime.onMessage.addListener((message, sender) => {
        if (typeof message !== "string" || !message.startsWith("HandledCMP|") || !sender.tab) {
            return false;
        }
        try {
            const json = JSON.parse(message.substring(message.indexOf("|") + 1));
            const k = key(sender.tab.id);
            session.get({ [k]: [] }).then((got) => {
                const list = got[k];
                list.push({ cmp: String(json.cmp || "?"), clicks: Number(json.clicks) || 0, at: Date.now() });
                return session.set({ [k]: list.slice(-10) });
            });
        } catch (_) { /* ignore */ }
        return false;
    });

    chrome.tabs.onUpdated.addListener((tabId, info) => {
        if (info.status === "loading") {
            session.remove(key(tabId));
        }
    });
    chrome.tabs.onRemoved.addListener((tabId) => session.remove(key(tabId)));
}
