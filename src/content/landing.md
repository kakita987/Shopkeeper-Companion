# Welcome!

Shop Titans expects you to keep track of a lot of information yourself. Your Collection Book, inventory, unlocked blueprints, and crafting goals can all matter when deciding what to do next, but that information isn't always where you need it. **Shopkeeper Companion helps you keep track of your progress and find the blueprints that matter to you.**

**Need to come back to this guide?** Click **Shopkeeper Companion** at the top of the page or **Guide** at the bottom at any time.

## Getting Started

### Import the Blueprint Library

Open **Settings** (the gear in the top right corner) and **Import** the current blueprint library.

You should only need to do this when setting up the app for the first time, or when you want to update your blueprint data.

## Blueprints

Browse the blueprint library by Group and Type.

Select a blueprint to view its details, including Stats, and crafting ingredients. **Dependent** and **Needed For** relationships are at the top.

### Track Your Progress

Update your blueprints with your own progress as you play.

Mark the blueprints you own and keep track of mastery and other progress. You can update this information whenever it is useful to you.

Your progress can help you make decisions when playing Shop Titans. For example, during **King's Caprice**, you might filter for dependent blueprints to help decide what to prioritize. When browsing the Marketplace, you might need to check your Collection Book status or inventory to decide whether an item is useful to you.

## Saved Views

Saved Views let you save useful combinations of filters so you can return to them later.

Create a filter that you expect to use again, then save it as a **Saved View**. Open the **Saved Views** tab to return to your saved filters.

Open a Saved View to use it again, or delete one when you no longer need it. The default views can also be deleted and are easy to recreate.

Saved Views are useful for recurring goals, such as tracking unfinished mastery or keeping a list of blueprints you want to work toward.

## Adding Your Progress Quickly

**For veteran players:** If you already have a lot of progress in Shop Titans, you can update many blueprints at once using a spreadsheet.

### Quick workflow

1. Download your CSV from Shopkeeper Companion.
2. Open it in Excel, Numbers, Google Sheets, or another spreadsheet app.
3. Edit your progress.
4. Save the file as **CSV**.
5. Upload the edited CSV back into Shopkeeper Companion.

**Why this is useful:** It is much faster than updating each blueprint one at a time.

## Back Up and Bulk Edit Your Progress

> **Best practice:** Keep a backup CSV before any large edit, transfer, or rebuild of your progress.

### 1) Download a backup CSV

1. Open **Settings**.
2. Go to **Save your progress**.
3. Select **Download progress CSV**.
4. Save it somewhere safe.

> **Note:** A new download creates a fresh snapshot. It does not overwrite an older copy automatically.
>
> **CSV contents:** Blueprint progress only. It does not include Saved Views, theme settings, or other app preferences.

### 2) Edit many blueprints in a spreadsheet

Open the CSV in a spreadsheet app. Each row is one blueprint, and rows are matched by **Blueprint Name** rather than their position in the file.

**Important rules:**

- Keep the header row unchanged.
- Keep each **Blueprint Name** exactly the same.
- Use whole numbers for inventory counts.
- Use `TRUE` or `FALSE` for `Owned`, `Starforge`, and collection fields.
- Use `Milestones` between 0 and 10.
- Use `Improve` between 0 and 6.
- Keep `Group`, `Type`, and `Tier` readable for reference.

> **Tip:** These columns help you identify rows, but your progress is still applied by **Blueprint Name**.

### 3) Upload the edited file

1. Save the spreadsheet file as **CSV**.
2. Open **Settings** in Shopkeeper Companion.
3. Under **Save your progress**, select **Upload edited CSV**.
4. Choose the file you edited.

**Result:** Any recognized rows are applied to your saved progress. Rows left out keep their existing values.

### When to use this

- Before a big play session or reset plan
- During a large collection or crafting project
- Anytime you want to update many blueprints at once
- Any time you want a portable backup you can restore later

**Fast rule:** Download a CSV, edit it, save it as CSV, then upload it back.