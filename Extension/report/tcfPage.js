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

    let lastTcf = null;
    function onTcData(d, ok) {
        if (!ok || !d || d.gdprApplies === false) {
            return;
        }
        if (d.eventStatus === "tcloaded" || d.eventStatus === "useractioncomplete") {
            lastTcf = tcfSummary(d);
            post(lastTcf);
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
