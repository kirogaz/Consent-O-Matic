// Consent report (fork addition).
// Renders "what was done / what the site has stored now" into #com-report in the popup.
(() => {
    const root = document.getElementById("com-report");
    if (!root) {
        return;
    }

    const RU = /^(ru|uk|be|kk)/i.test(navigator.language || "");
    const T = RU ? {
        handled: "Обработано", clicks: "кликов", stored: "Что сохранено на сайте",
        clean: "Передача данных партнёрам отключена",
        partial: "Согласие отклонено, но остался «законный интерес»",
        bad: "Есть разрешённые цели или партнёры",
        purposes: "Цели с согласием", none: "ни одной", of: "из",
        purposesLI: "Цели по «законному интересу»", off: "отключены",
        vendors: "Партнёров с согласием", vendorsLI: "Партнёров по «законному интересу»",
        google: "Партнёров Google (вне TCF)", special: "Геолокация / сканирование устройства",
        forbidden: "запрещены", details: "Все цели подробно", purpose: "Цель", consent: "Согл.", li: "Зак. инт.",
        source: "Данные из IAB TCF (__tcfapi), CMP id", noTcf: "Сайт не сообщает данные о согласии по стандарту TCF.",
        groups: "OneTrust: включённые группы", cookiebot: "Cookiebot", didomi: "Didomi: партнёров разрешено / запрещено",
        allowed: "разрешено", denied: "запрещено"
    } : {
        handled: "Handled", clicks: "clicks", stored: "What the site has stored",
        clean: "Data sharing with vendors is off",
        partial: "Consent rejected, but legitimate interest remains",
        bad: "Some purposes or vendors are allowed",
        purposes: "Purposes with consent", none: "none", of: "of",
        purposesLI: "Purposes by legitimate interest", off: "off",
        vendors: "Vendors with consent", vendorsLI: "Vendors by legitimate interest",
        google: "Google vendors (non-TCF)", special: "Geolocation / device scanning",
        forbidden: "denied", details: "All purposes", purpose: "Purpose", consent: "Cons.", li: "Leg. int.",
        source: "Data from IAB TCF (__tcfapi), CMP id", noTcf: "This site does not expose TCF consent data.",
        groups: "OneTrust: active groups", cookiebot: "Cookiebot", didomi: "Didomi: vendors allowed / denied",
        allowed: "allowed", denied: "denied"
    };
    const PURPOSES = RU ? [
        "Хранение и доступ к данным на устройстве", "Базовая реклама", "Профиль для персонализированной рекламы",
        "Показ персонализированной рекламы", "Профиль для персонализированного контента", "Показ персонализированного контента",
        "Измерение эффективности рекламы", "Измерение эффективности контента", "Исследование аудитории",
        "Разработка и улучшение сервисов", "Ограниченные данные для выбора контента"
    ] : [
        "Store and/or access information on a device", "Use limited data to select advertising", "Create profiles for personalised advertising",
        "Use profiles to select personalised advertising", "Create profiles to personalise content", "Use profiles to select personalised content",
        "Measure advertising performance", "Measure content performance", "Understand audiences",
        "Develop and improve services", "Use limited data to select content"
    ];

    const el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) {
            e.className = cls;
        }
        if (text !== undefined) {
            e.textContent = text;
        }
        return e;
    };
    const row = (label, value, good) => {
        const r = el("div", "kv");
        r.append(el("span", "", label), el("b", good === undefined ? "" : (good ? "good" : "bad"), value));
        return r;
    };

    function renderTcf(t) {
        const clean = !t.purposeConsents.length && !t.vendorConsents && !t.vendorLI && !t.purposeLI.length &&
            !t.specialFeatures.length && !t.googleConsents;
        const partial = !clean && !t.purposeConsents.length && !t.vendorConsents;
        root.append(el("div", "verdict " + (clean ? "v-good" : partial ? "v-mid" : "v-bad"),
            clean ? T.clean : partial ? T.partial : T.bad));

        const nP = t.purposeConsents.length;
        root.append(row(T.purposes, nP ? nP + " " + T.of + " 11" : T.none, !nP));
        root.append(row(T.purposesLI, t.purposeLI.length ? String(t.purposeLI.length) : T.off, !t.purposeLI.length));
        const known = t.vendorsKnown > t.vendorConsents ? " " + T.of + " " + t.vendorsKnown : "";
        root.append(row(T.vendors, t.vendorConsents + known, !t.vendorConsents));
        root.append(row(T.vendorsLI, String(t.vendorLI), !t.vendorLI));
        if (t.googleConsents !== null && t.googleConsents !== undefined) {
            root.append(row(T.google, String(t.googleConsents), !t.googleConsents));
        }
        root.append(row(T.special, t.specialFeatures.length ? t.specialFeatures.join(", ") : T.forbidden, !t.specialFeatures.length));

        const det = el("details");
        det.append(el("summary", "", T.details));
        const tbl = el("table");
        const hr = el("tr");
        hr.append(el("th", "", T.purpose), el("th", "", T.consent), el("th", "", T.li));
        tbl.append(hr);
        PURPOSES.forEach((name, i) => {
            const c = t.purposeConsents.includes(i + 1);
            const l = t.purposeLI.includes(i + 1);
            const tr = el("tr");
            tr.append(el("td", "", (i + 1) + ". " + name), el("td", c ? "bad" : "good", c ? "✓" : "✗"),
                el("td", l ? "bad" : "good", l ? "✓" : "✗"));
            tbl.append(tr);
        });
        det.append(tbl, el("div", "small", T.source + " " + t.cmpId));
        root.append(det);
    }

    function renderOther(o) {
        if (o.onetrustGroups) {
            root.append(row(T.groups, o.onetrustGroups.join(", ") || T.none));
        }
        if (o.cookiebot) {
            root.append(row(T.cookiebot, Object.entries(o.cookiebot)
                .map(([k, v]) => k + ": " + (v ? T.allowed : T.denied)).join(", ")));
        }
        if (o.didomi) {
            root.append(row(T.didomi, o.didomi.enabled + " / " + o.didomi.disabled));
        }
    }

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs && tabs[0];
        if (!tab) {
            return;
        }
        let handled = [];
        try {
            const k = "comReport_" + tab.id;
            handled = (await chrome.storage.session.get({ [k]: [] }))[k];
        } catch (_) { /* ignore */ }

        let status = null;
        try {
            status = await chrome.tabs.sendMessage(tab.id, { comReport: "get" }, { frameId: 0 });
        } catch (_) { /* no content script on this page */ }

        const hasOther = status && status.other && Object.keys(status.other).length;
        if (!handled.length && !(status && status.tcf) && !hasOther) {
            return;
        }
        root.hidden = false;
        handled.forEach((h) => root.append(el("div", "handled", "✔ " + T.handled + ": " + h.cmp + " (" + h.clicks + " " + T.clicks + ")")));
        root.append(el("h3", "", T.stored));
        if (status && status.tcf) {
            renderTcf(status.tcf);
        } else {
            root.append(el("div", "small", T.noTcf));
        }
        if (hasOther) {
            renderOther(status.other);
        }
    });
})();
