import { GroupId, CategoryId } from '../data/blueprintOrder';

/** A tier number from 1 (cheapest) to 13 (most advanced) */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/** A single craftable blueprint (list-level data) */
export interface Blueprint {
  id: string;        // unique slug, e.g. "squire-sword"
  name: string;      // display name, e.g. "Squire Sword"
  tier: Tier;        // crafting tier (T1–T13)
  unlocked: boolean; // whether the player has unlocked it
}

/** A category within a group, e.g. "Sword" inside "Weapons" */
export interface BlueprintCategory {
  id: CategoryId;
  name: string;
  blueprints: Blueprint[];
}

/** A top-level blueprint group, e.g. "Weapons" */
export interface BlueprintGroup {
  id: GroupId;
  name: string;
  /** Icon name from lucide-react to represent this group */
  icon: string;
  categories: BlueprintCategory[];
}

// ── Detail-level types (panel / spreadsheet) ─────────────────────────────────

/** One ingredient in the crafting recipe, e.g. Iron × 5 */
export interface BlueprintComponent {
  name: string;
  quantity: number;
}

/** A milestone unlock earned by crafting a blueprint repeatedly */
export interface CraftingUpgrade {
  /** Number of crafts required to unlock this reward */
  crafts: number;
  /** Human-readable reward description, e.g. "Blueprint: Shiv" */
  description: string;
}

/**
 * Full detail record for a blueprint.
 *
 * Every field beyond id/value/craftingTimeSeconds/components/stats is optional.
 * Sections whose data is absent or empty are hidden in the UI.
 *
 * This shape mirrors the columns expected from the spreadsheet:
 *   id | unlockPrerequisite | researchScrolls | antiqueTokens |
 *   value | craftingTimeSeconds | components | stats |
 *   elementalAffinity | craftingUpgrades | ascension
 */
export interface BlueprintDetail {
  /** Matches Blueprint.id */
  id: string;

  // ── Unlock requirements (any absent field = row hidden) ──
  unlockPrerequisite?: string;    // e.g. "Blacksmith", "Hero Pack"
  researchScrolls?: number;       // omit or 0 → row hidden
  antiqueTokens?: number;         // omit or 0 → row hidden

  // ── Crafting info (always present) ──
  value: number;                  // gold value
  craftingTimeSeconds: number;
  components: BlueprintComponent[];

  // ── Stats (section hidden if empty) ──
  stats: Record<string, number>;  // e.g. { ATK: 172, DEF: 43 }
  elementalAffinity?: string;     // e.g. "Light" — omit if none

  // ── Progression (sections hidden if empty) ──
  craftingUpgrades?: CraftingUpgrade[];
  ascension?: string[];           // list of ascension perk descriptions
}
