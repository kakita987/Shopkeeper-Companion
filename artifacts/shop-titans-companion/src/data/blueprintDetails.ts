import { BlueprintDetail } from '../types/blueprints';

/**
 * Placeholder detail records for the three example Sword blueprints.
 *
 * These mirror the column structure expected from the spreadsheet.
 * Fields that are absent cause their row or section to be hidden in the UI.
 * When the spreadsheet integration is added, this array will be replaced
 * by the fetched + parsed sheet rows.
 */
export const blueprintDetails: BlueprintDetail[] = [

  // ── Squire Sword ──────────────────────────────────────────────────────────
  {
    id: 'squire-sword',
    unlockPrerequisite: 'Blacksmith',
    // researchScrolls: omitted (None)
    // antiqueTokens: omitted (None)
    value: 50,
    craftingTimeSeconds: 15,
    components: [
      { name: 'Iron', quantity: 5 },
    ],
    stats: {
      ATK: 16,
    },
    // elementalAffinity: omitted (none)
    craftingUpgrades: [
      { crafts: 7,  description: 'Blueprint: Shiv' },
      { crafts: 18, description: 'Blueprint: Arming Sword' },
      { crafts: 32, description: '×1.5 Value Increase' },
    ],
    // ascension: omitted (none)
  },

  // ── Gladius ───────────────────────────────────────────────────────────────
  {
    id: 'gladius',
    // unlockPrerequisite: omitted (none)
    researchScrolls: 3,
    // antiqueTokens: omitted (none)
    value: 670,
    craftingTimeSeconds: 140,
    components: [
      { name: 'Iron Pine Cone', quantity: 2 },
    ],
    stats: {
      ATK: 52,
    },
    // elementalAffinity: omitted (Built-in Affinity: None)
    craftingUpgrades: [
      { crafts: 8,  description: '×1.25 Value Increase' },
      { crafts: 20, description: 'Blueprint: Cutlass' },
      { crafts: 36, description: '-25% Craft Time Reduction' },
      { crafts: 55, description: '-3 Iron Spent' },
    ],
    // ascension: omitted (none)
  },

  // ── Hero's Sword ──────────────────────────────────────────────────────────
  {
    id: 'heros-sword',
    unlockPrerequisite: "Hero Pack",
    // researchScrolls: omitted (none)
    antiqueTokens: 120,
    value: 11000,
    craftingTimeSeconds: 1290,
    components: [
      { name: 'Cutlass (Normal)', quantity: 1 },
      { name: 'Deep Pearl',       quantity: 1 },
    ],
    stats: {
      ATK: 172,
      DEF: 43,
    },
    elementalAffinity: 'Light',
    craftingUpgrades: [
      { crafts: 7,  description: '-25% Craft Time Reduction' },
      { crafts: 16, description: '×1.25 Value Increase' },
      { crafts: 30, description: '-2 Steel Spent' },
    ],
    ascension: [
      '-1 Deep Pearl Spent',
      '+10% Multicraft Chance',
      '-2 Steel Spent',
    ],
  },

];

/**
 * O(1) lookup by blueprint id.
 * Use this in the detail panel: blueprintDetailMap['squire-sword']
 */
export const blueprintDetailMap: Record<string, BlueprintDetail> =
  Object.fromEntries(blueprintDetails.map((d) => [d.id, d]));
