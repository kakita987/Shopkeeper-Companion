import { Axe, BadgeAlert, BadgeInfo, BowArrow, CakeSlice, CircleDashed, Crosshair, Diamond, Drumstick, Footprints, Gem, Hand, HandMetal, HardHat, HatGlasses, Leaf, MoonStar, Music2, PillBottle, Pizza, Salad, ScrollText, Shield, Shirt, Sparkles, Swords, Sword, Target, UtensilsCrossed, Wand, WandSparkles } from 'lucide'
import { BLUEPRINT_ASSET_PATHS, normalizeAssetPath, VITE_ASSET_URLS } from './blueprintAssetInventory.js'
import {
  normalizeKeyPart,
  parseCanonicalAssetLookupKey,
  toCanonicalBlueprintLookupKey,
} from './iconKey.js'

const GROUP_NAME_BY_FILE_KEY = {
  weapon: 'Weapons',
  armor: 'Armor',
  accessory: 'Accessories',
  enchantment: 'Enchantments',
}

const ALL_BLUEPRINT_TYPES = [
  'Sword',
  'Axe',
  'Dagger',
  'Mace',
  'Spear',
  'Bow',
  'Wand',
  'Staff',
  'Gun',
  'Crossbow',
  'Instrument',
  'Dual Wield',
  'Catalyst',
  'Heavy Armor',
  'Light Armor',
  'Clothes',
  'Helmet',
  'Rogue Hat',
  'Magician Hat',
  'Gauntlets',
  'Gloves',
  'Heavy Footwear',
  'Light Footwear',
  'Herbal Medicine',
  'Potion',
  'Spell',
  'Shield',
  'Cloak',
  'Ring',
  'Amulet',
  'Familiar',
  'Aurasong',
  'Quiver',
  'Idol',
  'Meal',
  'Dessert',
  'Element',
  'Spirit',
]

const TYPE_CANONICAL_BY_KEY = new Map(
  ALL_BLUEPRINT_TYPES.map((type) => [normalizeKeyPart(type), type])
)

const TYPE_ALIAS_TO_CANONICAL = new Map([
  ['herbalmedicine', 'Herbal Medicine'],
  ['cloth', 'Clothes'],
  ['garment', 'Clothes'],
  ['raiment', 'Clothes'],
])

const WEAPON_TYPES = new Set(['Sword', 'Axe', 'Dagger', 'Mace', 'Spear', 'Bow', 'Wand', 'Staff', 'Gun', 'Crossbow', 'Instrument', 'Dual Wield', 'Catalyst'])
const ARMOR_TYPES = new Set(['Heavy Armor', 'Light Armor', 'Clothes', 'Helmet', 'Rogue Hat', 'Magician Hat', 'Gauntlets', 'Gloves', 'Heavy Footwear', 'Light Footwear'])
const ACCESSORY_TYPES = new Set(['Herbal Medicine', 'Potion', 'Spell', 'Shield', 'Cloak', 'Ring', 'Amulet', 'Familiar', 'Aurasong', 'Quiver', 'Idol', 'Meal', 'Dessert'])
const ENCHANTMENT_TYPES = new Set(['Element', 'Spirit'])
const TIERED_FALLBACK_MIN_SCORE = 0.55
const TIERED_FALLBACK_MIN_MARGIN = 0.05

function resolveCanonicalType(type) {
  const rawType = String(type || '').trim()
  const normalizedType = normalizeKeyPart(rawType)
  if (!normalizedType) {
    return ''
  }

  const direct = TYPE_CANONICAL_BY_KEY.get(normalizedType)
  if (direct) {
    return direct
  }

  const alias = TYPE_ALIAS_TO_CANONICAL.get(normalizedType)
  if (alias) {
    return alias
  }

  if (normalizedType.includes('clothes') || normalizedType.includes('cloth')) {
    return 'Clothes'
  }

  return rawType
}

function resolveCanonicalGroupForType(type, group) {
  if (WEAPON_TYPES.has(type)) {
    return 'Weapons'
  }

  if (ARMOR_TYPES.has(type)) {
    return 'Armor'
  }

  if (ACCESSORY_TYPES.has(type)) {
    return 'Accessories'
  }

  if (ENCHANTMENT_TYPES.has(type)) {
    return 'Enchantments'
  }

  return String(group || '').trim()
}

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

    index.set(lookupKey, relativePath)
  })

  return index
}

const ITEM_ICON_INDEX = buildItemIconIndex()

function buildTieredItemIconByTypeTierIndex() {
  const index = new Map()

  BLUEPRINT_ASSET_PATHS.forEach((relativePath) => {
    const lookupKey = parseCanonicalAssetLookupKey(relativePath)
    if (!lookupKey) {
      return
    }

    const parts = lookupKey.split('::')
    if (parts.length !== 4) {
      return
    }

    const [groupSegment, typeSegment, tierSegment, nameSegment] = parts
    if (!groupSegment || !typeSegment || !tierSegment || !nameSegment) {
      return
    }

    const tierNumber = Number(tierSegment)
    if (!Number.isInteger(tierNumber) || tierNumber < 0) {
      return
    }

    const indexKey = `${groupSegment}::${typeSegment}::${tierNumber}`
    const existing = index.get(indexKey) || []
    existing.push({
      relativePath,
      nameSegment,
    })
    index.set(indexKey, existing)
  })

  return index
}

const TIERED_ITEM_ICON_BY_TYPE_TIER_INDEX = buildTieredItemIconByTypeTierIndex()

function buildNameLookupCandidates(name) {
  const raw = String(name || '').trim()
  if (!raw) {
    return []
  }

  const variants = [
    raw,
    raw.replace(/['’]s\b/gi, ''),
    raw.replace(/\bof\b/gi, ''),
  ]

  return [...new Set(variants.map((value) => normalizeKeyPart(value)).filter(Boolean))]
}

function buildBigrams(value) {
  const text = String(value || '')
  if (text.length < 2) {
    return new Set([text])
  }

  const grams = new Set()
  for (let index = 0; index < text.length - 1; index += 1) {
    grams.add(text.slice(index, index + 2))
  }

  return grams
}

function similarityScore(left, right) {
  const a = String(left || '')
  const b = String(right || '')
  if (!a || !b) {
    return 0
  }

  if (a === b) {
    return 1
  }

  const bigramsA = buildBigrams(a)
  const bigramsB = buildBigrams(b)
  let shared = 0
  bigramsA.forEach((gram) => {
    if (bigramsB.has(gram)) {
      shared += 1
    }
  })

  return (2 * shared) / (bigramsA.size + bigramsB.size)
}

function getTieredFallbackPath(group, type, tier, name) {
  if (!group || !type || tier === null) {
    return ''
  }

  const keyWithPlaceholderName = toCanonicalBlueprintLookupKey(group, type, tier, '__placeholder__')
  if (!keyWithPlaceholderName) {
    return ''
  }

  const baseSegments = keyWithPlaceholderName.split('::')
  if (baseSegments.length !== 4) {
    return ''
  }

  const tierIndexKey = baseSegments.slice(0, 3).join('::')
  const candidates = TIERED_ITEM_ICON_BY_TYPE_TIER_INDEX.get(tierIndexKey) || []
  if (!candidates.length) {
    return ''
  }

  if (candidates.length === 1) {
    return candidates[0].relativePath
  }

  const nameCandidates = buildNameLookupCandidates(name)
  if (!nameCandidates.length) {
    return ''
  }

  for (const candidateName of nameCandidates) {
    const exact = candidates.find((entry) => entry.nameSegment === candidateName)
    if (exact) {
      return exact.relativePath
    }
  }

  let best = null
  let secondBest = null

  candidates.forEach((entry) => {
    const score = Math.max(...nameCandidates.map((candidateName) => similarityScore(candidateName, entry.nameSegment)))
    const scored = { entry, score }
    if (!best || score > best.score) {
      secondBest = best
      best = scored
      return
    }

    if (!secondBest || score > secondBest.score) {
      secondBest = scored
    }
  })

  if (!best) {
    return ''
  }

  const margin = secondBest ? best.score - secondBest.score : best.score
  if (best.score < TIERED_FALLBACK_MIN_SCORE || margin < TIERED_FALLBACK_MIN_MARGIN) {
    return ''
  }

  return best.entry.relativePath
}

function getGroupTypeSet(group) {
  if (group === 'Armor') {
    return ARMOR_TYPES
  }

  if (group === 'Accessories') {
    return ACCESSORY_TYPES
  }

  if (group === 'Weapons') {
    return WEAPON_TYPES
  }

  return null
}

function getBestGroupTierFallbackPath(group, tier, name) {
  const typeSet = getGroupTypeSet(group)
  if (!typeSet || tier === null) {
    return ''
  }

  const nameCandidates = buildNameLookupCandidates(name)
  if (!nameCandidates.length) {
    return ''
  }

  let best = null
  let secondBest = null

  typeSet.forEach((candidateType) => {
    const keyWithPlaceholderName = toCanonicalBlueprintLookupKey(group, candidateType, tier, '__placeholder__')
    if (!keyWithPlaceholderName) {
      return
    }

    const tierIndexKey = keyWithPlaceholderName.split('::').slice(0, 3).join('::')
    const candidates = TIERED_ITEM_ICON_BY_TYPE_TIER_INDEX.get(tierIndexKey) || []
    if (!candidates.length) {
      return
    }

    if (candidates.length === 1) {
      const scored = { path: candidates[0].relativePath, score: 1 }
      if (!best || scored.score > best.score) {
        secondBest = best
        best = scored
      } else if (!secondBest || scored.score > secondBest.score) {
        secondBest = scored
      }
      return
    }

    candidates.forEach((entry) => {
      const score = Math.max(...nameCandidates.map((candidateName) => similarityScore(candidateName, entry.nameSegment)))
      const scored = {
        path: entry.relativePath,
        score,
      }
      if (!best || score > best.score) {
        secondBest = best
        best = scored
        return
      }

      if (!secondBest || score > secondBest.score) {
        secondBest = scored
      }
    })
  })

  if (!best) {
    return ''
  }

  const margin = secondBest ? best.score - secondBest.score : best.score
  if (best.score < TIERED_FALLBACK_MIN_SCORE || margin < TIERED_FALLBACK_MIN_MARGIN) {
    return ''
  }

  return best.path
}

function isGenericAccessoryType(type) {
  const normalizedType = normalizeKeyPart(type)
  return normalizedType === 'accessory' || normalizedType === 'accessories'
}

function isGenericArmorType(type) {
  const normalizedType = normalizeKeyPart(type)
  return normalizedType === 'armor' || normalizedType === 'armors' || normalizedType === 'armour' || normalizedType === 'armours'
}

function getAccessoryGenericTypeFallbackPath(tier, name) {
  return getBestGroupTierFallbackPath('Accessories', tier, name)
}

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
    const mappedNormalizedPath = normalizeAssetPath(mappedRelativePath)
    if (mappedNormalizedPath && VITE_ASSET_URLS.has(mappedNormalizedPath)) {
      return assetUrl(mappedNormalizedPath)
    }

    // Some generated mapping rows may lag behind renamed filenames.
    // Re-resolve by canonical key against the runtime asset index first.
    const mappedLookupKey = parseCanonicalAssetLookupKey(mappedNormalizedPath)
    if (mappedLookupKey) {
      const remappedPath = ITEM_ICON_INDEX.get(mappedLookupKey)
      if (remappedPath) {
        return assetUrl(remappedPath)
      }
    }
    // Do not return a stale/broken mapped path; continue to name/type matching.
  }

  const rawGroup = String(item?.classification?.group || '').trim()
  const rawType = String(item?.classification?.type || '').trim()
  const type = resolveCanonicalType(rawType)
  const group = resolveCanonicalGroupForType(type, rawGroup)
  const tier = getBlueprintTier(item)
  const name = String(item?.name || '').trim()

  if (!group || !type || tier === null || !name) {
    return ''
  }

  const key = toCanonicalBlueprintLookupKey(group, type, tier, name)
  if (!key) {
    return ''
  }

  const match = ITEM_ICON_INDEX.get(key)
  if (match) {
    return assetUrl(match)
  }

  const tieredFallback = getTieredFallbackPath(group, type, tier, name)
  if (tieredFallback) {
    return assetUrl(tieredFallback)
  }

  if (group === 'Accessories' && isGenericAccessoryType(rawType)) {
    const inferredAccessoryPath = getAccessoryGenericTypeFallbackPath(tier, name)
    if (inferredAccessoryPath) {
      return assetUrl(inferredAccessoryPath)
    }
  }

  if (group === 'Armor' && isGenericArmorType(rawType)) {
    const inferredArmorPath = getBestGroupTierFallbackPath('Armor', tier, name)
    if (inferredArmorPath) {
      return assetUrl(inferredArmorPath)
    }
  }

  // Assets without a tier segment are mid-rename and are intentionally ignored.
  return ''
}

function getGroupIconName(group) {
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
  if (/herbal medicine/.test(haystack)) return 'Leaf'
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