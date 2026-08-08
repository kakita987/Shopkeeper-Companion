import { BLUEPRINT_ASSET_PATHS } from '../blueprintAssetInventory.js'
import { parseCanonicalAssetIdentity } from '../iconKey.js'

const ACCESSORY_TYPE_BY_PREFIX_KEY = {
  amulet: 'Amulet',
  aurasong: 'Aurasong',
  cloak: 'Cloak',
  dessert: 'Dessert',
  familiar: 'Familiar',
  herbalmedicine: 'Herbal Medicine',
  meal: 'Meal',
  potion: 'Potion',
  quiver: 'Quiver',
  ring: 'Ring',
  shield: 'Shield',
  spell: 'Spell',
}

function parseAccessoryAssetPath(relativePath) {
  const identity = parseCanonicalAssetIdentity(relativePath)
  if (identity?.groupSegment !== 'accessory' || identity.tier === null) {
    return null
  }

  const type = ACCESSORY_TYPE_BY_PREFIX_KEY[identity.typeSegment]

  if (!type || identity.tier <= 0 || !identity.normalizedName) {
    return null
  }

  return {
    type,
    tier: identity.tier,
    itemKey: identity.normalizedName,
    relativePath,
  }
}

export const ACCESSORY_ITEM_ICON_ASSETS = BLUEPRINT_ASSET_PATHS
  .map(parseAccessoryAssetPath)
  .filter(Boolean)