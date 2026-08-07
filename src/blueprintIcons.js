import { Axe, BadgeAlert, BadgeInfo, BowArrow, CakeSlice, CircleDashed, Crosshair, Diamond, Drumstick, Footprints, Gem, Hand, HandMetal, HardHat, HatGlasses, Leaf, MoonStar, Music2, PillBottle, Pizza, Salad, ScrollText, Shield, Shirt, Sparkles, Swords, Sword, Target, UtensilsCrossed, Wand, WandSparkles } from 'lucide'
import { AURASONG_AMULET_ITEM_ICON_ASSETS } from './assets/accessoryItemIconAssets.js'

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
  return new URL(relativePath, import.meta.url).href
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

function normalizeNameForKey(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function buildNameCandidates(name) {
  const normalized = String(name || '').trim().toLowerCase()
  if (!normalized) {
    return []
  }

  const compact = normalized.replace(/[^a-z0-9]/g, '')
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean)
  const noStopwords = tokens.filter((token) => !['a', 'an', 'the', 'of'].includes(token)).join('')

  return [...new Set([compact, noStopwords].filter(Boolean))]
}

function buildItemIconIndex() {
  const index = new Map()
  AURASONG_AMULET_ITEM_ICON_ASSETS.forEach((entry) => {
    const type = String(entry?.type || '').trim()
    const tier = toTierNumber(entry?.tier)
    const itemKey = String(entry?.itemKey || '').trim()
    const relativePath = String(entry?.relativePath || '').trim()

    if (!['Amulet', 'Aurasong', 'Spell', 'Shield', 'Quiver', 'Potion', 'Ring', 'Meal', 'Herbal Medicine', 'Familiar', 'Dessert', 'Cloak'].includes(type) || tier === null || !itemKey || !relativePath) {
      return
    }

    const key = `${type}::${tier}::${normalizeNameForKey(itemKey)}`
    index.set(key, relativePath)
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
  'Heavy Armor': assetUrl('./assets/Armor/armor_armorheavy_type.png'),
  'Light Armor': assetUrl('./assets/Armor/armor_armorlight_type.png'),
  Clothes: assetUrl('./assets/Armor/armor_clothes_type.png'),
  Helmet: assetUrl('./assets/Armor/armor_helmet_type.png'),
  'Rogue Hat': assetUrl('./assets/Armor/armor_roguehat_type.png'),
  'Magician Hat': assetUrl('./assets/Armor/armor_hat_type.png'),
  Gauntlets: assetUrl('./assets/Armor/armor_gauntlets_type.png'),
  Gloves: assetUrl('./assets/Armor/armor_gloves_type.png'),
  'Heavy Footwear': assetUrl('./assets/Armor/armor_boots_type.png'),
  'Light Footwear': assetUrl('./assets/Armor/armor_shoes_type.png'),
  'Herbal Medicine': assetUrl('./assets/Accessory/accessory_herbalmedicine_type.png'),
  Potion: assetUrl('./assets/Accessory/accessory_potion_type.png'),
  Spell: assetUrl('./assets/Accessory/accessory_scrolls_type.png'),
  Shield: assetUrl('./assets/Accessory/accessory_shield_type.png'),
  Cloak: assetUrl('./assets/Accessory/accessory_cloak_type.png'),
  Ring: assetUrl('./assets/Accessory/accessory_ring_type.png'),
  Amulet: assetUrl('./assets/Accessory/accessory_amulet_type.png'),
  Familiar: assetUrl('./assets/Accessory/accessory_familiar_type.png'),
  Aurasong: assetUrl('./assets/Weapon/weapon_aurasong_type.png'),
  Quiver: assetUrl('./assets/Weapon/weapon_quiver_type.png'),
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
  const mappedRelativePath = String(item?.iconMapping?.itemIconRelativePath || '').trim()
  if (mappedRelativePath) {
    return assetUrl(mappedRelativePath)
  }

  const type = String(item?.classification?.type || '').trim()
  const tier = getBlueprintTier(item)
  const name = String(item?.name || '').trim()

  if (!['Amulet', 'Aurasong', 'Spell', 'Shield', 'Quiver', 'Potion', 'Ring', 'Meal', 'Herbal Medicine', 'Familiar', 'Dessert', 'Cloak'].includes(type) || !tier || !name) {
    return ''
  }

  const nameCandidates = buildNameCandidates(name)
  for (const candidate of nameCandidates) {
    const key = `${type}::${tier}::${candidate}`
    const match = ITEM_ICON_INDEX.get(key)
    if (match) {
      return assetUrl(match)
    }
  }

  return ''
}

export function getGroupIconName(group) {
  switch (group) {
    case 'Weapons':
      return 'Swords'
    case 'Armor':
      return 'Shield'
    case 'Accessories':
      return 'Gem'
    case 'Enchantments':
      return 'Sparkles'
    default:
      return 'CircleDashed'
  }
}

export function getTypeIconName(type, group) {
  const haystack = `${type || ''}`.toLowerCase()

  if (/sword/.test(haystack)) return 'Sword'
  if (/axe/.test(haystack)) return 'Axe'
  if (/dagger|mace|spear/.test(haystack)) return 'Swords'
  if (/bow|crossbow/.test(haystack)) return 'BowArrow'
  if (/gun/.test(haystack)) return 'Crosshair'
  if (/wand/.test(haystack)) return 'Wand'
  if (/staff|catalyst/.test(haystack)) return 'WandSparkles'
  if (/instrument/.test(haystack)) return 'Music2'
  if (/dual wield/.test(haystack)) return 'Swords'
  if (/heavy armor|light armor/.test(haystack)) return 'Shield'
  if (/clothes/.test(haystack)) return 'Shirt'
  if (/helmet/.test(haystack)) return 'HardHat'
  if (/rogue hat/.test(haystack)) return 'HatGlasses'
  if (/magician hat/.test(haystack)) return 'Sparkles'
  if (/gauntlets/.test(haystack)) return 'HandMetal'
  if (/gloves/.test(haystack)) return 'Hand'
  if (/heavy footwear|light footwear/.test(haystack)) return 'Footprints'
  if (/herbal remedy|herbal medicine/.test(haystack)) return 'Leaf'
  if (/potion/.test(haystack)) return 'PillBottle'
  if (/spell/.test(haystack)) return 'ScrollText'
  if (/cloak/.test(haystack)) return 'Shirt'
  if (/ring/.test(haystack)) return 'Gem'
  if (/amulet/.test(haystack)) return 'Diamond'
  if (/familiar/.test(haystack)) return 'CircleDashed'
  if (/aurasong/.test(haystack)) return 'Music2'
  if (/quiver/.test(haystack)) return 'Target'
  if (/idol/.test(haystack)) return 'BadgeInfo'
  if (/meal/.test(haystack)) return 'UtensilsCrossed'
  if (/dessert/.test(haystack)) return 'CakeSlice'
  if (/element/.test(haystack)) return 'Sparkles'
  if (/spirit/.test(haystack)) return 'MoonStar'

  return getGroupIconName(group)
}

export function getBlueprintItemIconName(item) {
  return getTypeIconName(item?.classification?.type, item?.classification?.group || item?.classification?.category)
}