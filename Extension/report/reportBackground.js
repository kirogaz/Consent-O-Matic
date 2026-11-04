// Consent report (fork addition).
// Remembers per tab which CMP Consent-O-Matic handled, so the popup can show it.
// Only listens; never replies, so it does not interfere with background.js.
import GDPRConfig from "../GDPRConfig.js";

// Fork rule fixes (e.g. Clickio legitimate interest in any language). Added after the upstream
// list, so a rule with the same name overrides the upstream one. Added once; if the user removes
// it in the options page, it stays removed.
const FORK_RULE_LIST = "https://raw.githubusercontent.com/kirogaz/Consent-O-Matic/master/fork-rules/list.json";
chrome.storage.local.get({ forkRuleListAdded: false }, ({ forkRuleListAdded }) => {
    if (forkRuleListAdded) {
        return;
    }
    GDPRConfig.getRuleLists().then((lists) => {
        const done = () => chrome.storage.local.set({ forkRuleListAdded: true });
        if (lists.includes(FORK_RULE_LIST)) {
            done();
        } else {
            GDPRConfig.addRuleList(FORK_RULE_LIST).then(done);
        }
    });
});

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
