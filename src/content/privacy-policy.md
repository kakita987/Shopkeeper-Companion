# Privacy Policy

**Effective Date:** July 2026

Shopkeeper Companion is a free, local-first web tool for **Shop Titans** players.

The short version: your player progress stays on your device unless you enable Google Sync. CSV backups are created and read locally. Limited page-view analytics and support-request processing use third-party services as described below.

## How Your Data Works

Shopkeeper Companion is designed to keep your data under your control.

- **Community Game Data:** Blueprint information comes from publicly available community sources. Shopkeeper Companion uses this data to provide an interface for organizing and viewing blueprint information.
- **Your Data Stays Yours:** Your settings and player progress data are stored on your device unless you choose to enable Google synchronization.
- **No Developer Database:** Shopkeeper Companion does not hold a server-side database of your activity or player data.
- **No Fingerprinting:** Shopkeeper Companion does not fingerprint your device or build an advertising profile from your player data.

## CSV Backup and Import

Shopkeeper Companion can create a CSV copy of your blueprint progress for backup and bulk editing. The CSV is generated in your browser and downloaded directly to your device. When you upload an edited CSV, it is read in your browser and applied to local progress data.

CSV files are not sent to Shopkeeper Companion, its developer, or another external service. You control where downloaded files are stored and whether you open them with a third-party spreadsheet application.

## Google Synchronization

Shopkeeper Companion uses ‘Sign in with Google’ and Google Sheets to optionally back up and sync your progress. Your Shopkeeper Companion spreadsheet is stored in your own Google Drive and allows two-way synchronization between the app and your saved progress.

This use of Google APIs follows the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements. Information received from Google APIs is used only to provide synchronization features and is not sold, shared, or used for advertising.

- **Authentication:** Google handles sign-in directly. Shopkeeper Companion receives a temporary access token in your browser and never receives your Google password.
- **Google Drive Access:** The app requests Google's limited `drive.file` permission. This allows it to create and edit its own data sheet and files you explicitly select through Google Picker; it does not grant general access to every file in your Drive.
- **Direct Connection:** Sync data travels directly between your browser and Google’s servers. It never passes through a middleman or developer server.
- **Managing Your Data:** You can delete the Shopkeeper Companion backup from your Google Drive at any time. If you are signed in and choose to sync again, the app may create a new spreadsheet for storing your progress.

## Analytics

Shopkeeper Companion uses Vercel Analytics to record page views, including the current page path and in-app hash route. Automatic tracking is disabled; the app sends page views when its pages and tracked views open.

This information is used to understand overall website performance and traffic trends. It does not include your blueprint progress or Google Sheet contents. Vercel processes analytics data under its own privacy terms.

## Support Requests

When you submit the in-site support form, the message and any screenshots you attach are sent through a serverless endpoint and stored as an issue and repository files in the configured GitHub repository. That repository may be public, so do not include passwords, tokens, private sheet links, or other sensitive information.

The endpoint temporarily groups submission timestamps by IP address in server memory to enforce a short rate limit. This rate-limit state is not a permanent user database.

## Third-Party Services

Shopkeeper Companion may use external services:

- **EthicalAds:** Used to display privacy-preserving advertisements. EthicalAds does not use tracking cookies or sell your personal data.
- **Ko-fi:** An optional link for users who wish to support development. Any transactions are handled entirely on Ko-fi's platform.
- **GitHub:** Stores support issues and support-form attachments.
- **Vercel:** Hosts the site, processes the support endpoint, and provides page-view analytics.

These services may have their own privacy policies.

## Contact

If you have feature requests, bug reports, documentation suggestions, or questions, you can use the in-site Support page or submit directly through the GitHub repository issue links.