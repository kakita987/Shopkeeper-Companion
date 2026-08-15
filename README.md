# Shopkeeper Companion

A local-first blueprint tracker and collection companion for Shop Titans. The app is a multi-page Vite site written in browser-native JavaScript.

## Development

```sh
npm install
cp .env.example .env.local
npm run dev
```

The Vite server prints the local URL. Other useful commands:

```sh
npm test       # Run the Node test suite with the asset import shim
npm run build  # Build every HTML entry into dist/
npm run preview
```

## Configuration

Client variables are compiled into the browser bundle and must use the `VITE_` prefix. Do not put secrets in them.

| Variable | Purpose |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | Google Identity Services OAuth client ID. |
| `VITE_GOOGLE_API_KEY` | Google Picker developer key. |
| `VITE_BLUEPRINT_SHEET_URL` | Optional override for the public blueprint source sheet. |
| `VITE_SHOW_ADS` | Set to `true` to load EthicalAds; ads are disabled otherwise. |
| `GITHUB_ISSUE_TOKEN` | Server-only token used to create support issues and upload attachments. |
| `GITHUB_ISSUE_REPO` | Target support repository in `owner/repo` form. |
| `GITHUB_ISSUE_ASSET_PATH` | Repository directory for support attachments. |
| `GITHUB_ISSUE_ASSET_BRANCH` | Branch receiving support attachments. |

In Vercel, add `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_API_KEY` to the Production environment. Enter only each value, without quotes or a `VITE_GOOGLE_CLIENT_ID=`/`VITE_GOOGLE_API_KEY=` prefix. Because Vite compiles these variables into the browser bundle, redeploy after adding or changing them; an existing deployment does not receive environment variable changes retroactively.

## Entry Points

Vite builds five pages:

| Page | Browser entry | Responsibility |
| --- | --- | --- |
| `index.html` | `src/main.js` | Blueprint browser, progress tracking, Saved Views, settings, and sync orchestration. |
| `about.html` | `src/about.js` | Renders `src/content/about.md` through the shared docs-page shell. |
| `bulk-edit.html` | `src/bulkEdit.js` | Renders CSV backup, bulk-edit, and optional Google Sync documentation through the shared docs-page shell. |
| `privacy.html` | `src/privacy.js` | Renders the privacy policy through the shared docs-page shell. |
| `support.html` | `src/support.js` | Validates and submits support tickets. |

`api/submit-issue.js` is the production serverless support endpoint. `vite.config.js` contains the equivalent development middleware plus development-only spreadsheet URL proxies. Changes to support request handling must be kept aligned between those two entry points.

## Module Map

- `src/blueprintParsing.js` converts source-sheet rows into blueprint records. It shares the canonical group/type taxonomy in `src/assets/blueprintTypeOrder.js` with sync, navigation, and icon resolution.
- `src/blueprintView.js` contains pure rendering and summary helpers. `src/main.js` owns DOM event binding and mutable application state.
- `src/blueprintIcons.js`, `src/blueprintAssetInventory.js`, and `src/iconKey.js` work together to normalize blueprint identities and resolve imported image assets.
- `src/storage.js` owns local persistence and migrations. Compatibility branches for older progress, collection, layout, and cache formats are intentional.
- `src/savedViews.js` owns Saved View criteria normalization, persistence, and workbook serialization. `src/main.js` renders and binds the Saved Views interface.
- `src/googleSheetSync.js` owns workbook creation, migration, serialization, and Google Sheets/Drive requests. `src/useGoogleAuth.js` owns OAuth token state, while `src/googleDrivePicker.js` owns Picker loading and selection.
- `src/supportTicketSchema.js` is the shared validation and issue-formatting layer used by the support page and both support HTTP handlers.
- `src/docsPage.js` and `src/markdownRenderer.js` provide the shared static-document rendering path.

Tests live beside their modules as `src/*.test.js`. `src/testAssetInventory.js` supplies the Node loader behavior needed for imported image assets.

## Data Boundaries

Progress and preferences are stored locally unless Google Sync is enabled. Google Sync writes to a spreadsheet in the user's Drive using the `drive.file` scope. Support submissions are sent to the configured GitHub repository through the serverless endpoint. Vercel Analytics records explicit page views; see the in-app Privacy page for details.
