// Consent report (fork addition).
// Isolated-world content script, top frame only: keeps the latest summary posted by
// tcfPage.js and hands it to the popup on request.
(() => {
    if (window !== window.top) {
        return;
    }
    let latest = null;

    window.addEventListener("message", (e) => {
        if (e.source !== window || !e.data || e.data.__comReport !== "status") {
            return;
        }
        const d = e.data.data || {};
        latest = {
            tcf: d.tcf && typeof d.tcf === "object" ? d.tcf : null,
            other: d.other && typeof d.other === "object" ? d.other : {},
            at: Date.now()
        };
    });

    chrome.runtime.onMessage.addListener((message, sender, reply) => {
        if (message && message.comReport === "get") {
            reply(latest);
        }
        return false;
    });
})();
