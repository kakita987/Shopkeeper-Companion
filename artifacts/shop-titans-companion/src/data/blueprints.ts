import { BlueprintGroup } from '../types/blueprints';

// Placeholder data covering basic Shop Titans categories with realistic tiers and unlock states
export const blueprintData: BlueprintGroup[] = [
  {
    id: 'weapons',
    name: 'Weapons',
    icon: 'Sword', // string name for lucide-react icon matching
    categories: [
      {
        id: 'swords',
        name: 'Swords',
        blueprints: [
          { id: 'iron-sword', name: 'Iron Sword', tier: 1, unlocked: true },
          { id: 'steel-sword', name: 'Steel Sword', tier: 2, unlocked: true },
          { id: 'elven-sword', name: 'Elven Sword', tier: 3, unlocked: true },
          { id: 'flamberge', name: 'Flamberge', tier: 4, unlocked: false },
          { id: 'excalibur', name: 'Excalibur', tier: 5, unlocked: false },
        ]
      },
      {
        id: 'axes',
        name: 'Axes',
        blueprints: [
          { id: 'wood-axe', name: 'Wood Axe', tier: 1, unlocked: true },
          { id: 'battle-axe', name: 'Battle Axe', tier: 2, unlocked: true },
          { id: 'bearded-axe', name: 'Bearded Axe', tier: 3, unlocked: false },
          { id: 'halberd', name: 'Halberd', tier: 4, unlocked: false },
        ]
      },
      {
        id: 'spears',
        name: 'Spears',
        blueprints: [
          { id: 'wooden-spear', name: 'Wooden Spear', tier: 1, unlocked: true },
          { id: 'iron-pike', name: 'Iron Pike', tier: 2, unlocked: true },
          { id: 'trident', name: 'Trident', tier: 3, unlocked: false },
        ]
      },
      {
        id: 'bows',
        name: 'Bows',
        blueprints: [
          { id: 'shortbow', name: 'Shortbow', tier: 1, unlocked: true },
          { id: 'longbow', name: 'Longbow', tier: 2, unlocked: true },
          { id: 'composite-bow', name: 'Composite Bow', tier: 3, unlocked: true },
          { id: 'elven-bow', name: 'Elven Bow', tier: 4, unlocked: false },
        ]
      },
      {
        id: 'daggers',
        name: 'Daggers',
        blueprints: [
          { id: 'shiv', name: 'Shiv', tier: 1, unlocked: true },
          { id: 'dirk', name: 'Dirk', tier: 2, unlocked: true },
          { id: 'kris', name: 'Kris', tier: 3, unlocked: false },
        ]
      }
    ]
  },
  {
    id: 'armor',
    name: 'Armor',
    icon: 'Shield',
    categories: [
      {
        id: 'helmets',
        name: 'Helmets',
        blueprints: [
          { id: 'leather-cap', name: 'Leather Cap', tier: 1, unlocked: true },
          { id: 'iron-helm', name: 'Iron Helm', tier: 2, unlocked: true },
          { id: 'steel-helm', name: 'Steel Helm', tier: 3, unlocked: false },
          { id: 'knight-helm', name: 'Knight Helm', tier: 4, unlocked: false },
        ]
      },
      {
        id: 'chestplates',
        name: 'Chestplates',
        blueprints: [
          { id: 'leather-armor', name: 'Leather Armor', tier: 1, unlocked: true },
          { id: 'chainmail', name: 'Chainmail', tier: 2, unlocked: true },
          { id: 'iron-cuirass', name: 'Iron Cuirass', tier: 3, unlocked: true },
          { id: 'steel-plate', name: 'Steel Plate', tier: 4, unlocked: false },
          { id: 'mithril-plate', name: 'Mithril Plate', tier: 5, unlocked: false },
        ]
      },
      {
        id: 'boots',
        name: 'Boots',
        blueprints: [
          { id: 'leather-boots', name: 'Leather Boots', tier: 1, unlocked: true },
          { id: 'iron-greaves', name: 'Iron Greaves', tier: 2, unlocked: true },
          { id: 'steel-greaves', name: 'Steel Greaves', tier: 3, unlocked: false },
        ]
      },
      {
        id: 'gloves',
        name: 'Gloves',
        blueprints: [
          { id: 'leather-gloves', name: 'Leather Gloves', tier: 1, unlocked: true },
          { id: 'iron-gauntlets', name: 'Iron Gauntlets', tier: 2, unlocked: true },
          { id: 'steel-gauntlets', name: 'Steel Gauntlets', tier: 3, unlocked: false },
        ]
      }
    ]
  },
  {
    id: 'accessories',
    name: 'Accessories',
    icon: 'Gem',
    categories: [
      {
        id: 'rings',
        name: 'Rings',
        blueprints: [
          { id: 'copper-ring', name: 'Copper Ring', tier: 1, unlocked: true },
          { id: 'silver-ring', name: 'Silver Ring', tier: 2, unlocked: true },
          { id: 'gold-ring', name: 'Gold Ring', tier: 3, unlocked: false },
          { id: 'ruby-ring', name: 'Ruby Ring', tier: 4, unlocked: false },
        ]
      },
      {
        id: 'amulets',
        name: 'Amulets',
        blueprints: [
          { id: 'wooden-charm', name: 'Wooden Charm', tier: 1, unlocked: true },
          { id: 'silver-amulet', name: 'Silver Amulet', tier: 2, unlocked: true },
          { id: 'gold-amulet', name: 'Gold Amulet', tier: 3, unlocked: true },
          { id: 'sapphire-amulet', name: 'Sapphire Amulet', tier: 4, unlocked: false },
        ]
      },
      {
        id: 'capes',
        name: 'Capes',
        blueprints: [
          { id: 'traveler-cape', name: 'Traveler Cape', tier: 1, unlocked: true },
          { id: 'knight-cape', name: 'Knight Cape', tier: 2, unlocked: true },
          { id: 'king-cape', name: 'King Cape', tier: 3, unlocked: false },
        ]
      }
    ]
  }
];
