import { BlueprintGroup } from '../types/blueprints';
import { GroupId, CategoryId } from './blueprintOrder';

/**
 * Placeholder blueprint data.
 *
 * Groups appear in GROUP_ORDER order; categories within each group appear in
 * CATEGORY_ORDER order. Neither the data file nor the UI sorts these — the
 * sequence here is the display sequence.
 *
 * Categories that don't have placeholder blueprints yet carry an empty array.
 * Real blueprint rows will be filled in as the app grows.
 */
export const blueprintData: BlueprintGroup[] = [

  // ── Weapons ────────────────────────────────────────────────────────────────
  {
    id: GroupId.Weapons,
    name: 'Weapons',
    icon: 'Sword',
    categories: [
      {
        id: CategoryId.Sword,
        name: 'Sword',
        blueprints: [
          // ── Placeholder blueprints with full detail data ──
          { id: 'squire-sword', name: 'Squire Sword',  tier: 1, unlocked: true  },
          { id: 'gladius',      name: 'Gladius',       tier: 3, unlocked: true  },
          { id: 'heros-sword',  name: "Hero's Sword",  tier: 5, unlocked: false },
          // ── Additional placeholders (detail data not yet added) ──
          { id: 'iron-sword',   name: 'Iron Sword',    tier: 1, unlocked: true  },
          { id: 'steel-sword',  name: 'Steel Sword',   tier: 2, unlocked: true  },
          { id: 'elven-sword',  name: 'Elven Sword',   tier: 3, unlocked: true  },
          { id: 'flamberge',    name: 'Flamberge',     tier: 4, unlocked: false },
          { id: 'excalibur',    name: 'Excalibur',     tier: 5, unlocked: false },
        ],
      },
      {
        id: CategoryId.Axe,
        name: 'Axe',
        blueprints: [
          { id: 'wood-axe',    name: 'Wood Axe',    tier: 1, unlocked: true  },
          { id: 'battle-axe',  name: 'Battle Axe',  tier: 2, unlocked: true  },
          { id: 'bearded-axe', name: 'Bearded Axe', tier: 3, unlocked: false },
          { id: 'halberd',     name: 'Halberd',     tier: 4, unlocked: false },
        ],
      },
      {
        id: CategoryId.Dagger,
        name: 'Dagger',
        blueprints: [
          { id: 'shiv', name: 'Shiv', tier: 1, unlocked: true  },
          { id: 'dirk', name: 'Dirk', tier: 2, unlocked: true  },
          { id: 'kris', name: 'Kris', tier: 3, unlocked: false },
        ],
      },
      {
        id: CategoryId.Mace,
        name: 'Mace',
        blueprints: [],
      },
      {
        id: CategoryId.Spear,
        name: 'Spear',
        blueprints: [
          { id: 'wooden-spear', name: 'Wooden Spear', tier: 1, unlocked: true  },
          { id: 'iron-pike',    name: 'Iron Pike',    tier: 2, unlocked: true  },
          { id: 'trident',      name: 'Trident',      tier: 3, unlocked: false },
        ],
      },
      {
        id: CategoryId.Bow,
        name: 'Bow',
        blueprints: [
          { id: 'shortbow',      name: 'Shortbow',      tier: 1, unlocked: true  },
          { id: 'longbow',       name: 'Longbow',       tier: 2, unlocked: true  },
          { id: 'composite-bow', name: 'Composite Bow', tier: 3, unlocked: true  },
          { id: 'elven-bow',     name: 'Elven Bow',     tier: 4, unlocked: false },
        ],
      },
      {
        id: CategoryId.Wand,
        name: 'Wand',
        blueprints: [],
      },
      {
        id: CategoryId.Staff,
        name: 'Staff',
        blueprints: [],
      },
      {
        id: CategoryId.Gun,
        name: 'Gun',
        blueprints: [],
      },
      {
        id: CategoryId.Crossbow,
        name: 'Crossbow',
        blueprints: [],
      },
      {
        id: CategoryId.Instrument,
        name: 'Instrument',
        blueprints: [],
      },
      {
        id: CategoryId.DualWield,
        name: 'Dual Wield',
        blueprints: [],
      },
      {
        id: CategoryId.Catalyst,
        name: 'Catalyst',
        blueprints: [],
      },
    ],
  },

  // ── Armor ──────────────────────────────────────────────────────────────────
  {
    id: GroupId.Armor,
    name: 'Armor',
    icon: 'Shield',
    categories: [
      {
        id: CategoryId.HeavyArmor,
        name: 'Heavy Armor',
        blueprints: [
          { id: 'leather-armor', name: 'Leather Armor', tier: 1, unlocked: true  },
          { id: 'chainmail',     name: 'Chainmail',     tier: 2, unlocked: true  },
          { id: 'iron-cuirass',  name: 'Iron Cuirass',  tier: 3, unlocked: true  },
          { id: 'steel-plate',   name: 'Steel Plate',   tier: 4, unlocked: false },
          { id: 'mithril-plate', name: 'Mithril Plate', tier: 5, unlocked: false },
        ],
      },
      {
        id: CategoryId.LightArmor,
        name: 'Light Armor',
        blueprints: [],
      },
      {
        id: CategoryId.Clothes,
        name: 'Clothes',
        blueprints: [],
      },
      {
        id: CategoryId.Helmet,
        name: 'Helmet',
        blueprints: [
          { id: 'leather-cap', name: 'Leather Cap', tier: 1, unlocked: true  },
          { id: 'iron-helm',   name: 'Iron Helm',   tier: 2, unlocked: true  },
          { id: 'steel-helm',  name: 'Steel Helm',  tier: 3, unlocked: false },
          { id: 'knight-helm', name: 'Knight Helm', tier: 4, unlocked: false },
        ],
      },
      {
        id: CategoryId.RogueHat,
        name: 'Rogue Hat',
        blueprints: [],
      },
      {
        id: CategoryId.MagicianHat,
        name: 'Magician Hat',
        blueprints: [],
      },
      {
        id: CategoryId.Gauntlets,
        name: 'Gauntlets',
        blueprints: [
          { id: 'iron-gauntlets',  name: 'Iron Gauntlets',  tier: 2, unlocked: true  },
          { id: 'steel-gauntlets', name: 'Steel Gauntlets', tier: 3, unlocked: false },
        ],
      },
      {
        id: CategoryId.Gloves,
        name: 'Gloves',
        blueprints: [
          { id: 'leather-gloves', name: 'Leather Gloves', tier: 1, unlocked: true },
        ],
      },
      {
        id: CategoryId.HeavyFootwear,
        name: 'Heavy Footwear',
        blueprints: [
          { id: 'iron-greaves',  name: 'Iron Greaves',  tier: 2, unlocked: true  },
          { id: 'steel-greaves', name: 'Steel Greaves', tier: 3, unlocked: false },
        ],
      },
      {
        id: CategoryId.LightFootwear,
        name: 'Light Footwear',
        blueprints: [
          { id: 'leather-boots', name: 'Leather Boots', tier: 1, unlocked: true },
        ],
      },
    ],
  },

  // ── Accessories ────────────────────────────────────────────────────────────
  {
    id: GroupId.Accessories,
    name: 'Accessories',
    icon: 'Gem',
    categories: [
      {
        id: CategoryId.HerbalMedicine,
        name: 'Herbal Medicine',
        blueprints: [],
      },
      {
        id: CategoryId.Potion,
        name: 'Potion',
        blueprints: [],
      },
      {
        id: CategoryId.Spell,
        name: 'Spell',
        blueprints: [],
      },
      {
        id: CategoryId.Shield,
        name: 'Shield',
        blueprints: [],
      },
      {
        id: CategoryId.Cloak,
        name: 'Cloak',
        blueprints: [
          { id: 'traveler-cape', name: 'Traveler Cape', tier: 1, unlocked: true  },
          { id: 'knight-cape',   name: 'Knight Cape',   tier: 2, unlocked: true  },
          { id: 'king-cape',     name: 'King Cape',     tier: 3, unlocked: false },
        ],
      },
      {
        id: CategoryId.Ring,
        name: 'Ring',
        blueprints: [
          { id: 'copper-ring', name: 'Copper Ring', tier: 1, unlocked: true  },
          { id: 'silver-ring', name: 'Silver Ring', tier: 2, unlocked: true  },
          { id: 'gold-ring',   name: 'Gold Ring',   tier: 3, unlocked: false },
          { id: 'ruby-ring',   name: 'Ruby Ring',   tier: 4, unlocked: false },
        ],
      },
      {
        id: CategoryId.Amulet,
        name: 'Amulet',
        blueprints: [
          { id: 'wooden-charm',    name: 'Wooden Charm',    tier: 1, unlocked: true  },
          { id: 'silver-amulet',   name: 'Silver Amulet',   tier: 2, unlocked: true  },
          { id: 'gold-amulet',     name: 'Gold Amulet',     tier: 3, unlocked: true  },
          { id: 'sapphire-amulet', name: 'Sapphire Amulet', tier: 4, unlocked: false },
        ],
      },
      {
        id: CategoryId.Familiar,
        name: 'Familiar',
        blueprints: [],
      },
      {
        id: CategoryId.AuraSong,
        name: 'Aura Song',
        blueprints: [],
      },
      {
        id: CategoryId.Quiver,
        name: 'Quiver',
        blueprints: [],
      },
      {
        id: CategoryId.Idol,
        name: 'Idol',
        blueprints: [],
      },
      {
        id: CategoryId.Meal,
        name: 'Meal',
        blueprints: [],
      },
      {
        id: CategoryId.Dessert,
        name: 'Dessert',
        blueprints: [],
      },
    ],
  },

  // ── Enchantments ───────────────────────────────────────────────────────────
  {
    id: GroupId.Enchantments,
    name: 'Enchantments',
    icon: 'Sparkles',
    categories: [
      {
        id: CategoryId.Spirit,
        name: 'Spirit',
        blueprints: [],
      },
      {
        id: CategoryId.Element,
        name: 'Element',
        blueprints: [],
      },
    ],
  },

];
