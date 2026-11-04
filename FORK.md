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

The report is read-only: it never changes consent. It is wired into the Chromium build only
(it uses a `world: "MAIN"` content script).

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
