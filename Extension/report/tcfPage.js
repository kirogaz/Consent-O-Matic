// Consent report (fork addition).
// Runs in the page's MAIN world, top frame only. Read-only: it never changes consent,
// it only reads what the site's CMP has stored via the IAB TCF API (__tcfapi)
// and a few CMP-specific globals, and posts a summary to tcfBridge.js.
(() => {
    if (window !== window.top || window.__comReportLoaded) {
        return;
    }
    window.__comReportLoaded = true;

    const WAIT_FOR_API_MS = 30000;

    const trueKeys = (o) => Object.entries(o || {}).filter(([, v]) => v === true).map(([k]) => Number(k));
    const countTrue = (o) => trueKeys(o).length;

    function tcfSummary(d) {
        const ac = typeof d.addtlConsent === "string" ? d.addtlConsent.split("~") : [];
        const vc = (d.vendor && d.vendor.consents) || {};
        const vl = (d.vendor && d.vendor.legitimateInterests) || {};
        return {
            cmpId: d.cmpId,
            event: d.eventStatus,
            purposeConsents: trueKeys(d.purpose && d.purpose.consents),
            purposeLI: trueKeys(d.purpose && d.purpose.legitimateInterests),
            specialFeatures: trueKeys(d.specialFeatureOptins),
            vendorConsents: countTrue(vc),
            vendorLI: countTrue(vl),
            vendorsKnown: Math.max(Object.keys(vc).length, Object.keys(vl).length),
            googleConsents: ac.length > 1 ? ac[1].split(".").filter(Boolean).length : null
        };
    }

    function otherCmpStatus() {
        const out = {};
        try {
            if (typeof window.OnetrustActiveGroups === "string") {
                out.onetrustGroups = window.OnetrustActiveGroups.split(",").filter(Boolean);
            }
        } catch (_) { /* ignore */ }
        try {
            if (window.Cookiebot && window.Cookiebot.consent && window.Cookiebot.hasResponse) {
                const c = window.Cookiebot.consent;
                out.cookiebot = { preferences: !!c.preferences, statistics: !!c.statistics, marketing: !!c.marketing };
            }
        } catch (_) { /* ignore */ }
        try {
            if (window.Didomi && typeof window.Didomi.getUserStatus === "function") {
                const s = window.Didomi.getUserStatus();
                out.didomi = { enabled: s.vendors.consent.enabled.length, disabled: s.vendors.consent.disabled.length };
            }
        } catch (_) { /* ignore */ }
        return out;
    }

    let last = "";
    function post(tcf) {
        const msg = { tcf: tcf || null, other: otherCmpStatus() };
        const key = JSON.stringify(msg);
        if (key === last) {
            return;
        }
        last = key;
        window.postMessage({ __comReport: "status", data: msg }, "*");
    }

    // ---- Cleanup of remaining "legitimate interest" ----
    // Runs only when the bridge says Consent-O-Matic is active on this site, and only if the
    // stored choice already has zero consents (i.e. it was a rejection), so it never overrides
    // categories the user chose to allow in Consent-O-Matic's settings.
    let cleanupAllowed = false;
    let cleanupDone = false;

    function cleanupLegitimateInterest(sum) {
        if (!cleanupAllowed || cleanupDone || !sum) {
            return;
        }
        const liLeft = sum.purposeLI.length > 0 || sum.vendorLI > 0;
        const rejected = sum.purposeConsents.length === 0 && sum.vendorConsents === 0;
        if (!liLeft || !rejected) {
            return;
        }
        let how = null;
        try {
            if (window.Didomi && typeof window.Didomi.setUserDisagreeToAll === "function") {
                window.Didomi.setUserDisagreeToAll();
                how = "Didomi.setUserDisagreeToAll()";
            } else if (window.OneTrust && typeof window.OneTrust.RejectAll === "function") {
                window.OneTrust.RejectAll();
                how = "OneTrust.RejectAll()";
            }
        } catch (_) { /* ignore */ }
        cleanupDone = true;
        window.postMessage({
            __comReport: "cleanup",
            data: { how, before: { purposeLI: sum.purposeLI.length, vendorLI: sum.vendorLI } }
        }, "*");
    }

    window.addEventListener("message", (e) => {
        if (e.source === window && e.data && e.data.__comReport === "cleanup-allowed") {
            cleanupAllowed = true;
            if (lastTcf) {
                cleanupLegitimateInterest(lastTcf);
            }
        }
    });

    let lastTcf = null;
    function onTcData(d, ok) {
        if (!ok || !d || d.gdprApplies === false) {
            return;
        }
        if (d.eventStatus === "tcloaded" || d.eventStatus === "useractioncomplete") {
            lastTcf = tcfSummary(d);
            post(lastTcf);
            // also covers a choice stored on an earlier visit ("tcloaded");
            // give the CMP a moment to finish its own save before touching it
            setTimeout(() => cleanupLegitimateInterest(lastTcf), 1000);
        }
    }

    const t0 = Date.now();
    const timer = setInterval(() => {
        if (typeof window.__tcfapi === "function") {
            clearInterval(timer);
            try {
                window.__tcfapi("addEventListener", 2, onTcData);
            } catch (_) { /* ignore */ }
        } else if (Date.now() - t0 > WAIT_FOR_API_MS) {
            clearInterval(timer);
        }
    }, 250);

    // Non-TCF CMPs (OneTrust/Cookiebot without TCF): re-check their globals for a while
    let checks = 0;
    const otherTimer = setInterval(() => {
        post(lastTcf);
        if (++checks > 20) {
            clearInterval(otherTimer);
        }
    }, 1500);
})();
