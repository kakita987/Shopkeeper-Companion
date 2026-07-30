# Shopkeeper Companion - Project Guidelines

## Project Purpose
Shopkeeper Companion is a utility app for Shop Titans players.

The goal is to help players manage blueprint information, crafting relationships, and personal progress with a fast, practical, information-rich companion tool.

Prioritize:
1. Player experience and existing design intent.
2. Data accuracy and user data safety.
3. Maintainable, reliable code.

## Content Resources

The files in `content/*.md` are website content resources loaded and displayed by the website.

Treat these files as read-only.

## Data Architecture

Keep these separate:

- **Master Game Data:** Imported Shop Titans blueprint information from community sources.
- **User Progress Data:** Player-specific information such as owned blueprints, inventory, mastery, goals, and saved views.

Do not store imported game data as user progress data.

## Import Pipeline

The blueprint importer and data transformation pipeline are foundational parts of the application.

Source data comes from:
`playshoptitans.com/spreadsheet` (Google Sheets)

The importer should transform external data into the application's internal structure rather than relying on source formatting.

Important data rules:
- Groups are broad classifications such as Weapons, Armor, Accessories, and Enchantments.
- Categories are game-defined item types within Groups, such as Sword, Potion, etc.
- Group and Category relationships were manually collected from the game and are not directly provided by the spreadsheet.
- Enchantments are categorized as Element or Spirit based on their names.

Preserve these relationships when modifying import or data logic.

## Blueprint Relationships

Use these terms consistently:

- **Needed:** A blueprint required as a crafting component.
- **Dependent:** A blueprint that requires another crafted blueprint as a component.

## UI Guidelines

Maintain the existing design direction:
- Fast access to information.
- Dense but readable layouts.
- Efficient filtering and searching.
- Useful detail views and overlays.
- Compatibility with existing themes and font preferences.

Small personality details are intentional, including Shop Titans-themed elements such as randomized Ko-fi messages.

## Code Changes

When modifying code:
- Prefer simple, maintainable solutions.
- Avoid unnecessary rewrites or architectural changes.
- Preserve existing behavior unless a change is intentional.
- Add comments when they explain why something exists, not obvious implementation details.