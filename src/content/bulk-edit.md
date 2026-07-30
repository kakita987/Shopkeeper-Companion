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

## Google Sheet Tabs

### ReadMe
- Instructions and sync information.

### Blueprint Tabs
- Blueprint information and your personal progress data.
- Each row represents one blueprint.
- Inventory counts use whole numbers.
- Checkbox fields use TRUE/FALSE values.

### Saved Views
- Stores saved filter and search configurations.

### Settings
- Stores app preferences such as theme and font settings.

## Editing Your Google Sheet

The app is the primary way to manage your companion data. The Google Sheet is an optional tool for backups and bulk editing.

To make bulk changes:
1. Open Shopkeeper Companion User Data in Google Drive.
2. Edit the values you want to change.
3. Force-save your changes in the sheet with Ctrl + S or Cmd + S.
4. Return to Shopkeeper Companion.
5. Open Settings.
6. Select Sync Now.

Your changes will be imported into the app.

## Backup and Data Safety
Your Google Sheet is stored in your own Google Drive. It provides a backup of your companion progress and allows advanced spreadsheet editing when needed.

## Troubleshooting