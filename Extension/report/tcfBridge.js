// Consent report (fork addition).
// Isolated-world content script, top frame only: keeps the latest summary posted by
// tcfPage.js and hands it to the popup on request. Also tells tcfPage.js whether it may
// run the legitimate-interest cleanup (only where Consent-O-Matic is active on the site).
import GDPRConfig from "../GDPRConfig.js";

(() => {
    if (window !== window.top) {
        return;
    }
    let latest = null;
    let cleanup = null;

    window.addEventListener("message", (e) => {
        if (e.source !== window || !e.data) {
            return;
        }
        const d = e.data.data || {};
        if (e.data.__comReport === "status") {
            latest = {
                tcf: d.tcf && typeof d.tcf === "object" ? d.tcf : null,
                other: d.other && typeof d.other === "object" ? d.other : {},
                at: Date.now()
            };
        } else if (e.data.__comReport === "cleanup") {
            cleanup = {
                how: typeof d.how === "string" ? d.how.slice(0, 80) : null,
                before: d.before && typeof d.before === "object"
                    ? { purposeLI: Number(d.before.purposeLI) || 0, vendorLI: Number(d.before.vendorLI) || 0 }
                    : null
            };
        }
    });

    GDPRConfig.isActive(location.host).then((active) => {
        if (active) {
            window.postMessage({ __comReport: "cleanup-allowed" }, "*");
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, reply) => {
        if (message && message.comReport === "get") {
            reply(latest ? Object.assign({ cleanup }, latest) : (cleanup ? { cleanup } : null));
        }
        return false;
    });
})();
