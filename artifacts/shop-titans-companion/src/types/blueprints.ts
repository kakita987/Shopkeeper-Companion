import { GroupId, CategoryId } from '../data/blueprintOrder';

/** A tier number from 1 (cheapest) to 13 (most advanced) */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/** A single craftable blueprint */
export interface Blueprint {
  id: string;        // unique slug, e.g. "iron-sword"
  name: string;      // display name, e.g. "Iron Sword"
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
