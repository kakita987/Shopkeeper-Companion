# Backup & Bulk Edit Guide

## Save Your Progress

Shopkeeper Companion stores your progress in your browser. The standard way to keep a portable copy is to download a progress CSV from **Save your progress** in Settings.

Each download creates a fresh snapshot. It does not update an older file automatically, so keep the latest copy somewhere safe if you want an up-to-date backup.

The CSV contains blueprint progress only. Saved Views, theme, font, and other app settings are not included.

## Download a CSV

1. Open Settings.
2. Find **Save your progress**.
3. Select **Download progress CSV**.
4. Store the downloaded file wherever you keep your backups.

You can open the CSV in Google Sheets, Excel, Numbers, LibreOffice, or another spreadsheet editor.

## Bulk Edit Progress

Each row represents one blueprint. Blueprint records are matched by `Blueprint Name`, not row position, so rows can be reordered without changing which blueprint receives the progress.

### Important Rules

- Keep the header row unchanged.
- Keep each `Blueprint Name` unchanged.
- Use whole numbers for inventory counts.
- Use `TRUE` or `FALSE` for `Owned`, `Starforge`, and Collection fields.
- `Milestones` accepts 0–10: Milestones 1–5 followed by Starforge 1–5.
- `Improve` accepts 0–6: Improve 1–3 followed by Transcendence 1–3.
- The `Group`, `Type`, and `Tier` columns identify blueprints for readability; progress is still matched by `Blueprint Name`.

## Upload an Edited CSV

1. Save your spreadsheet edits as a CSV file.
2. Open Settings in Shopkeeper Companion.
3. Under **Save your progress**, select **Upload edited CSV**.
4. Choose the edited file.

Recognized rows are applied to the progress stored in your browser. Rows not included in the CSV keep their existing progress.

After importing, download a new CSV if you want a fresh backup containing the applied changes.

## Google Sync

Google Sync is an optional convenience for two-way synchronization with a Google Sheet in your Drive. It is separate from CSV saving and is currently unavailable while an API configuration issue is resolved.

CSV download and upload remain available without signing in to Google.

## Troubleshooting

- If an upload is rejected, confirm the file is a CSV and includes the `Blueprint Name` header.
- If a row does not update, restore its original `Blueprint Name` and the original progress column headers.
- If a value does not apply, use a whole number or `TRUE`/`FALSE` as described above.
- If you imported the wrong file, upload a previous CSV backup to restore the progress values it contains.