# Google Sync Documentation

## Overview
Google Sync creates a private Google Sheet in your Google Drive that acts as a backup and advanced editing tool.

The app remains the primary experience. Most users can use Shopkeeper Companion normally without editing the sheet.

### Connecting Google Sync

1. Open the Settings panel in Shopkeeper Companion.
2. Select Sign In with Google.
3. In the window that pops up, sign in to your Google account.
4. Allow Shopkeeper Companion to create a private data sheet in your Google Drive.

Your sheet will be created automatically and will appear in Google Drive as:
    Shopkeeper Companion User Data

## How Sync Works
- Changes made in the app can be synced to your Google Sheet.
- Changes made in the Google Sheet can be loaded back into the app.
- Blueprint records are matched by Blueprint Name, not row order.
- You can reorder rows without breaking sync.

## Using Your Google Sheet

### Important Rules
- Do not rename tabs.
- Do not change column headers.
- Blueprint names must remain unchanged because they identify records during sync.
- Empty unused rows and columns are not required.

### Opening Your Sheet

After connecting, use the Google Sync controls in Settings to open the linked sheet. You can also use Google Picker to select an existing Shopkeeper Companion sheet or choose where a new sheet is created.

## Google Sheet Tabs

### ReadMe
- Instructions and sync information.

### Blueprint Tabs
- Blueprint information and your personal progress data.
- Each row represents one blueprint.
- Inventory counts use whole numbers.
- `Owned`, `Starforge`, and Collection Book fields use TRUE/FALSE values.
- `Milestones` stores progress from 0–10: Milestones 1–5 followed by Starforge 1–5.
- `Improve` stores progress from 0–6: Improve 1–3 followed by Transcendence 1–3.

### Saved Views
- Stores saved filter and search configurations.

### Settings
- Stores app preferences such as theme and font settings.

## Editing Your Google Sheet

The app is the primary way to manage your companion data. The Google Sheet is an optional tool for backups and bulk editing.

To make bulk changes:
1. Open Shopkeeper Companion User Data in Google Drive.
2. Edit the values you want to change.
3. Wait for Google Sheets to show that the changes are saved.
4. Return to Shopkeeper Companion.
5. Open Settings.
6. Select Sync Now.

Your changes will be imported into the app.

## Backup and Data Safety
Your Google Sheet is stored in your own Google Drive. It provides a backup of your companion progress and allows advanced spreadsheet editing when needed.

## Troubleshooting

- If the Picker does not open, allow popups for the site and confirm the deployment has a Google API key configured.
- If rows do not update, restore the original tab names, column headers, and Blueprint Name values.
- If a sheet was moved or replaced, use Picker in Settings to link the correct spreadsheet and sync again.