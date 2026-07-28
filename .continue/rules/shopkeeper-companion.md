# Shopkeeper Companion - Project Guidelines

## Project Intent

Shopkeeper Companion is a utility-focused companion app for Shop Titans players.
The goal is to help players manage blueprint information, crafting relationships, and personal progress more effectively than the game's built-in tools.
The app should feel like a companion tool: fast, practical, information-rich, and enjoyable to use.

## Guiding Principles

When making decisions, prioritize:
1. **Player Experience:** Preserve the app's purpose, usability, personality, and intentional design choices.
2. **Data Integrity:** Protect accurate game data, player progress, and existing workflows.
3. **Technical Quality:** Improve maintainability, reliability, performance, and simplicity where possible.

A technical improvement is valuable only if it supports the first two principles.

## Design Philosophy

When changing UI, interactions, or information presentation:
- Understand why the current design exists.
- Preserve useful workflows and player expectations.
- Consider tradeoffs between technical simplicity and user experience.

Small details that add personality, whimsy, or connection to the game are intentional parts of the experience.
For example:
- The Ko-fi tip messages include randomized Shop Titans-themed references because they make supporting the project feel more personal.

## Application Architecture

Implementation details may change when they provide a clear benefit.
Prefer:
- Clear, maintainable solutions.
- Improvements that reduce complexity.
- Changes that are understandable and reviewable.

Major architectural changes should consider:
- User experience impact.
- Maintainability.
- Long-term stability.

## Data Separation

Keep a clear separation between:
- **Master Game Data:** Imported Shop Titans blueprint data from community sources.
- **User Progress Data:** Player-specific information such as ownership, inventory, mastery, goals, and saved views.

Do not mix player progress information into imported game data.

## Import Pipeline

The source of the blueprints is 'playshoptitans.com/spreadsheet'
The importer and data transformation pipeline are foundational parts of the application. The accuracy of the imported blueprint data affects every feature built on top of it.
The importer is responsible for translating Shop Titans data into the application's internal blueprint structure.
Some data relationships are intentional even when they are not directly represented in the source spreadsheet.

For example:
- **Groups** represent broad classifications such as Weapons, Armor, Accessories, and Enchantments.
- **Categories** are specific item types within Groups, such as Sword, Potion, and other game-defined categories.
- Group and Category relationships were manually sourced from the game, and are not directly present on the spreadsheet.
- Enchantments are either **Element** or **Spirit** based on their names. This distinction is intentional for organization and should be preserved.

## User Data & Synchronization

The application should prioritize:
- Reliable storage of player progress.
- Protection against accidental data loss.
- Reliable synchronization between available storage locations.
- Compatibility with existing player data.

## UI Guidelines

Shopkeeper Companion should prioritize:
- Quick access to information.
- Dense but readable layouts.
- Efficient filtering and searching.
- Useful overlays and detail views.

Maintain compatibility with:
- Theme settings.
- Font preferences.
- Existing visual systems.

## Blueprint Organization

- **Groups:** Broad classifications such as Weapons, Armor, Accessories, and Enchantments.
- **Categories:** Specific item types within groups, such as Sword, Potion, and other game-defined categories.

## Blueprint Relationships

Use these terms consistently:
- **Needed:** This blueprint is required as a crafting component.
- **Dependent:** This blueprint requires another crafted item as a component.

## Development Practices

When making changes:
- Preserve existing user-facing functionality.
- Ask for clarification when requirements are unclear or when a change could significantly affect existing behavior.
- Keep changes understandable and reviewable.