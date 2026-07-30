# Shopkeeper Companion - Project Guidelines

## Project Purpose
Shopkeeper Companion is a utility app for Shop Titans players.

The goal is to help players manage blueprint information, crafting relationships, and personal progress with a fast, practical, information-rich companion tool.

## Content Resources

The files in `content/*.md` are website content resources loaded and displayed by the website. Treat these files as read-only.

## Import Pipeline

The blueprint importer and data transformation pipeline are foundational parts of the application.

Source data comes from:
`playshoptitans.com/spreadsheet` (redirects to a Google Sheet)

The importer should transform external data into the application's internal structure rather than relying on source formatting.

Important data rules:
- Groups are broad classifications.
- Categories are the sub-groups.
- The Group and Category structure below is the authoritative in-game organization.
- Category order below must be preserved when displaying categories.
- The source spreadsheet does not always match the in-game order. The corrected order is here:
**Weapons**
Categories: Sword, Axe, Dagger, Mace, Spear, Bow, Wand, Staff, Gun, Crossbow, Instrument, Dual Wield, Catalyst
**Armor**
Categories: Heavy Armor, Light Armor, Clothes, Helmet, Rogue Hat, Magician Hat, Gauntlets, Gloves, Heavy Footwear, Light Footwear
**Accessories**
Categories: Herbal Remedy, Potion, Spell, Shield, Cloak, Ring, Amulet, Familiar, Aurasong, Quiver, Idol, Meal, Dessert
**Enchantments**
Enchantments must be categorized as Element or Spirit based on their names.

## Blueprint Relationships

Use these terms consistently:
- **Needed:** A blueprint required as a crafting component.
- **Dependent:** A blueprint that requires another crafted blueprint as a component.

## Code Changes

When modifying code:
- Prefer simple, maintainable solutions.
- Add comments as you go to explain why something exists.