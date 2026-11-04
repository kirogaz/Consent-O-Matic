# Fork: Consent-O-Matic + consent report

This is a fork of [cavi-au/Consent-O-Matic](https://github.com/cavi-au/Consent-O-Matic) (MIT).
It adds a **consent report** to the popup: after a banner is handled you can see
what the site has actually stored.

- Which CMP Consent-O-Matic handled on this tab, and how many clicks it took.
- From the IAB TCF API (`__tcfapi`): purposes with consent, purposes by legitimate interest,
  number of vendors with consent / legitimate interest (e.g. "0 of 196"),
  Google Additional Consent vendors, special features (geolocation, device scanning),
  and a per-purpose table.
- For non-TCF CMPs: OneTrust active groups, Cookiebot categories, Didomi vendor counts.

The report is wired into the Chromium build only (it uses a `world: "MAIN"` content script).

## Legitimate-interest cleanup

Many rules only switch off *consent* toggles, so vendors can keep processing data under
"legitimate interest". The fork closes that gap in two ways:

- **Cleanup** (`Extension/report/tcfPage.js`): when the TCF data shows that consent was fully
  rejected but legitimate interest is still on, it calls the CMP's own reject-everything API
  (`Didomi.setUserDisagreeToAll()`, `OneTrust.RejectAll()`), which also objects to legitimate
  interest. It runs only on sites where Consent-O-Matic is enabled and never when any consent
  is granted, so categories you allowed in the settings are left alone. The popup shows what
  was removed.
- **Rule fixes** (`fork-rules/`): rules that override upstream ones with the same name.
  `clickio.json` finds the "legitimate interest" and "partners" tabs in any language
  (upstream matched only the English titles, so on Italian sites legitimate interest stayed on).
  The extension adds `fork-rules/list.json` after the upstream list once, on first start.

## Where the fork's code lives

All new code is in `Extension/report/`. Changes to upstream files are kept to a few lines:

| File | Change |
|---|---|
| `webpack.config.js` | 3 new entries / 2 files added to `ui` |
| `Extension/manifest.chromium.json` | 2 content scripts |
| `Extension/popup.html` | stylesheet link + `<div id="com-report">` |

## Staying up to date

- **Rules** are fetched at runtime from upstream's `rules-list.json`, so new CMP rules
  arrive automatically, exactly as in the original extension.
- **Code**: `.github/workflows/sync-upstream.yml` merges `upstream/master` weekly
  (or run it manually from the Actions tab). A conflict makes the run fail and GitHub
  sends a notification. Manual sync:

  ```bash
  git remote add upstream https://github.com/cavi-au/Consent-O-Matic.git
  git fetch upstream && git merge upstream/master
  ```

## Build

`npm ci && npx webpack --env target=chromium`, then load `build/` via
`chrome://extensions` → "Load unpacked". Every push to `master` also builds it in GitHub
Actions (artifact `consent-o-matic-chromium`).
