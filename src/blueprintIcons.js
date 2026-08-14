import { Axe, BadgeAlert, BadgeInfo, BowArrow, CakeSlice, CircleDashed, Crosshair, Diamond, Drumstick, Footprints, Gem, Hand, HandMetal, HardHat, HatGlasses, Leaf, MoonStar, Music2, PillBottle, Pizza, Salad, ScrollText, Shield, Shirt, Sparkles, Swords, Sword, Target, UtensilsCrossed, Wand, WandSparkles } from 'lucide'
import { BLUEPRINT_ASSET_PATHS, normalizeAssetPath, VITE_ASSET_URLS } from './blueprintAssetInventory.js'
import {
  parseCanonicalAssetLookupKey,
  toCanonicalBlueprintLookupKey,
} from './iconKey.js'

export const LUCIDE_ICONS = {
  Axe,
  BadgeAlert,
  BadgeInfo,
  BowArrow,
  CakeSlice,
  CircleDashed,
  Crosshair,
  Diamond,
  Drumstick,
  Footprints,
  Gem,
  Hand,
  HandMetal,
  HardHat,
  HatGlasses,
  Leaf,
  MoonStar,
  Music2,
  PillBottle,
  Pizza,
  Salad,
  ScrollText,
  Shield,
  Shirt,
  Sparkles,
  Swords,
  Sword,
  Target,
  UtensilsCrossed,
  Wand,
  WandSparkles,
}

function assetUrl(relativePath) {
  const normalizedPath = normalizeAssetPath(relativePath)
  if (!normalizedPath) {
    return ''
  }

  const viteAssetUrl = VITE_ASSET_URLS.get(normalizedPath)
  if (viteAssetUrl) {
    return viteAssetUrl
  }

  return new URL(normalizedPath, import.meta.url).href
}

function toTierNumber(value) {
  const parsed = Number(value)
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed
  }

  return null
}

function getBlueprintTier(item) {
  const structuredTier = toTierNumber(item?.structuredData?.meta?.tier)
  if (structuredTier !== null) {
    return structuredTier
  }

  const metaMatch = String(item?.meta || '').match(/tier\s+(\d+)/i)
  return metaMatch?.[1] ? Number(metaMatch[1]) : null
}

function buildItemIconIndex() {
  const index = new Map()

  BLUEPRINT_ASSET_PATHS.forEach((relativePath) => {
    const lookupKey = parseCanonicalAssetLookupKey(relativePath)
    if (!lookupKey) {
      return
    }

    if (index.has(lookupKey)) {
      throw new Error(`Duplicate blueprint asset key for ${index.get(lookupKey)} and ${relativePath}`)
    }

    index.set(lookupKey, relativePath)
  })

  return index
}

const ITEM_ICON_INDEX = buildItemIconIndex()

const GROUP_ICON_PATHS = {
  Weapons: assetUrl('./assets/Weapon/weapon_group.png'),
  Armor: assetUrl('./assets/Armor/armor_group.png'),
  Accessories: assetUrl('./assets/Accessory/accessory_group.png'),
  Enchantments: assetUrl('./assets/Enchantment/enchantment_group.png'),
}

const TYPE_ICON_PATHS = {
  Sword: assetUrl('./assets/Weapon/weapon_sword_type.png'),
  Axe: assetUrl('./assets/Weapon/weapon_axe_type.png'),
  Dagger: assetUrl('./assets/Weapon/weapon_dagger_type.png'),
  Mace: assetUrl('./assets/Weapon/weapon_mace_type.png'),
  Spear: assetUrl('./assets/Weapon/weapon_spear_type.png'),
  Bow: assetUrl('./assets/Weapon/weapon_bow_type.png'),
  Wand: assetUrl('./assets/Weapon/weapon_wand_type.png'),
  Staff: assetUrl('./assets/Weapon/weapon_staff_type.png'),
  Gun: assetUrl('./assets/Weapon/weapon_gun_type.png'),
  Crossbow: assetUrl('./assets/Weapon/weapon_crossbow_type.png'),
  Instrument: assetUrl('./assets/Weapon/weapon_instrument_type.png'),
  'Dual Wield': assetUrl('./assets/Weapon/weapon_dualwield_type.png'),
  Catalyst: assetUrl('./assets/Weapon/weapon_catalyst_type.png'),
  Scythe: assetUrl('./assets/Weapon/weapon_scythe_type.png'),
  'Heavy Armor': assetUrl('./assets/Armor/armor_heavy_armor_type.png'),
  'Light Armor': assetUrl('./assets/Armor/armor_light_armor_type.png'),
  Clothes: assetUrl('./assets/Armor/armor_clothes_type.png'),
  Helmet: assetUrl('./assets/Armor/armor_helmet_type.png'),
  'Rogue Hat': assetUrl('./assets/Armor/armor_rogue_hat_type.png'),
  'Magician Hat': assetUrl('./assets/Armor/armor_magician_hat_type.png'),
  Mask: assetUrl('./assets/Armor/armor_mask_type.png'),
  Gauntlets: assetUrl('./assets/Armor/armor_gauntlets_type.png'),
  Gloves: assetUrl('./assets/Armor/armor_gloves_type.png'),
  'Heavy Footwear': assetUrl('./assets/Armor/armor_heavy_footwear_type.png'),
  'Light Footwear': assetUrl('./assets/Armor/armor_light_footwear_type.png'),
  'Herbal Medicine': assetUrl('./assets/Accessory/accessory_herbalmedicine_type.png'),
  Potion: assetUrl('./assets/Accessory/accessory_potion_type.png'),
  Spell: assetUrl('./assets/Accessory/accessory_scrolls_type.png'),
  Shield: assetUrl('./assets/Accessory/accessory_shield_type.png'),
  Cloak: assetUrl('./assets/Accessory/accessory_cloak_type.png'),
  Ring: assetUrl('./assets/Accessory/accessory_ring_type.png'),
  Amulet: assetUrl('./assets/Accessory/accessory_amulet_type.png'),
  Familiar: assetUrl('./assets/Accessory/accessory_familiar_type.png'),
  Aurasong: assetUrl('./assets/Accessory/accessory_aurasong_type.png'),
  Quiver: assetUrl('./assets/Accessory/weapon_quiver_type.png'),
  Idol: assetUrl('./assets/Accessory/accessory_idol_type.png'),
  Meal: assetUrl('./assets/Accessory/accessory_meal_type.png'),
  Dessert: assetUrl('./assets/Accessory/accessory_dessert_type.png'),
  Element: assetUrl('./assets/Enchantment/enchantment_element_type.png'),
  Spirit: assetUrl('./assets/Enchantment/enchantment_spirit_type.png'),
}

export function getGroupIconPath(group) {
  return GROUP_ICON_PATHS[group] || ''
}

export function getTypeIconPath(type) {
  return TYPE_ICON_PATHS[type] || ''
}

export function getBlueprintItemIconPath(item) {
  const group = String(item?.classification?.group || '').trim()
  const type = String(item?.classification?.type || '').trim()
  const tier = getBlueprintTier(item)
  const name = String(item?.name || '').trim()

  if (!group || !type || tier === null || !name) {
    return getTypeIconPath(type)
  }

  const key = toCanonicalBlueprintLookupKey(group, type, tier, name)
  if (!key) {
    return getTypeIconPath(type)
  }

  const match = ITEM_ICON_INDEX.get(key)
  if (match) {
    return assetUrl(match)
  }

  return getTypeIconPath(type)
}
