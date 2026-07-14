/**
 * Canonical ordering for blueprint groups and categories.
 *
 * This is the single source of truth for display order throughout the app.
 * The UI must never sort groups or categories alphabetically — it should
 * always reference GROUP_ORDER and CATEGORY_ORDER when iterating.
 *
 * The order here reflects the in-game organization of Shop Titans.
 */

// ── Group identifiers ────────────────────────────────────────────────────────

export enum GroupId {
  Weapons      = 'weapons',
  Armor        = 'armor',
  Accessories  = 'accessories',
  Enchantments = 'enchantments',
}

/** The fixed display order for all blueprint groups. */
export const GROUP_ORDER: GroupId[] = [
  GroupId.Weapons,
  GroupId.Armor,
  GroupId.Accessories,
  GroupId.Enchantments,
];

// ── Category identifiers ─────────────────────────────────────────────────────

export enum CategoryId {
  // Weapons
  Sword      = 'sword',
  Axe        = 'axe',
  Dagger     = 'dagger',
  Mace       = 'mace',
  Spear      = 'spear',
  Bow        = 'bow',
  Wand       = 'wand',
  Staff      = 'staff',
  Gun        = 'gun',
  Crossbow   = 'crossbow',
  Instrument = 'instrument',
  DualWield  = 'dual-wield',
  Catalyst   = 'catalyst',

  // Armor
  HeavyArmor    = 'heavy-armor',
  LightArmor    = 'light-armor',
  Clothes       = 'clothes',
  Helmet        = 'helmet',
  RogueHat      = 'rogue-hat',
  MagicianHat   = 'magician-hat',
  Gauntlets     = 'gauntlets',
  Gloves        = 'gloves',
  HeavyFootwear = 'heavy-footwear',
  LightFootwear = 'light-footwear',

  // Accessories
  HerbalMedicine = 'herbal-medicine',
  Potion         = 'potion',
  Spell          = 'spell',
  Shield         = 'shield',
  Cloak          = 'cloak',
  Ring           = 'ring',
  Amulet         = 'amulet',
  Familiar       = 'familiar',
  AuraSong       = 'aura-song',
  Quiver         = 'quiver',
  Idol           = 'idol',
  Meal           = 'meal',
  Dessert        = 'dessert',

  // Enchantments
  Spirit  = 'spirit',
  Element = 'element',
}

/**
 * The fixed display order of categories within each group.
 * Add new categories here; the data file and UI pick up the order automatically.
 */
export const CATEGORY_ORDER: Record<GroupId, CategoryId[]> = {
  [GroupId.Weapons]: [
    CategoryId.Sword,
    CategoryId.Axe,
    CategoryId.Dagger,
    CategoryId.Mace,
    CategoryId.Spear,
    CategoryId.Bow,
    CategoryId.Wand,
    CategoryId.Staff,
    CategoryId.Gun,
    CategoryId.Crossbow,
    CategoryId.Instrument,
    CategoryId.DualWield,
    CategoryId.Catalyst,
  ],
  [GroupId.Armor]: [
    CategoryId.HeavyArmor,
    CategoryId.LightArmor,
    CategoryId.Clothes,
    CategoryId.Helmet,
    CategoryId.RogueHat,
    CategoryId.MagicianHat,
    CategoryId.Gauntlets,
    CategoryId.Gloves,
    CategoryId.HeavyFootwear,
    CategoryId.LightFootwear,
  ],
  [GroupId.Accessories]: [
    CategoryId.HerbalMedicine,
    CategoryId.Potion,
    CategoryId.Spell,
    CategoryId.Shield,
    CategoryId.Cloak,
    CategoryId.Ring,
    CategoryId.Amulet,
    CategoryId.Familiar,
    CategoryId.AuraSong,
    CategoryId.Quiver,
    CategoryId.Idol,
    CategoryId.Meal,
    CategoryId.Dessert,
  ],
  [GroupId.Enchantments]: [
    CategoryId.Spirit,
    CategoryId.Element,
  ],
};
