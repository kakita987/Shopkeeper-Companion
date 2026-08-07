import { Axe, BadgeAlert, BadgeInfo, BowArrow, CakeSlice, CircleDashed, Crosshair, Diamond, Drumstick, Footprints, Gem, Hand, HandMetal, HardHat, HatGlasses, Leaf, MoonStar, Music2, PillBottle, Pizza, Salad, ScrollText, Shield, Shirt, Sparkles, Swords, Sword, Target, UtensilsCrossed, Wand, WandSparkles } from 'lucide'

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

function isAurasongOrAmuletType(type) {
  return type === 'Aurasong' || type === 'Amulet'
}

const GROUP_ICON_PATHS = {
  Weapons: assetUrl('./assets/Groups/weapon_group.png'),
  Armor: assetUrl('./assets/Groups/armor_group.png'),
  Accessories: assetUrl('./assets/Groups/accessory_group.png'),
  Enchantments: assetUrl('./assets/Groups/enchantment_group.png'),
}

const TYPE_ICON_PATHS = {
  Sword: assetUrl('./assets/Types/weapon_sword_type.png'),
  Axe: assetUrl('./assets/Types/weapon_axe_type.png'),
  Dagger: assetUrl('./assets/Types/weapon_dagger_type.png'),
  Mace: assetUrl('./assets/Types/weapon_mace_type.png'),
  Spear: assetUrl('./assets/Types/weapon_spear_type.png'),
  Bow: assetUrl('./assets/Types/weapon_bow_type.png'),
  Wand: assetUrl('./assets/Types/weapon_wand_type.png'),
  Staff: assetUrl('./assets/Types/weapon_staff_type.png'),
  Gun: assetUrl('./assets/Types/weapon_gun_type.png'),
  Crossbow: assetUrl('./assets/Types/weapon_crossbow_type.png'),
  Instrument: assetUrl('./assets/Types/weapon_instrument_type.png'),
  'Dual Wield': assetUrl('./assets/Types/weapon_dualwield_type.png'),
  Catalyst: assetUrl('./assets/Types/weapon_catalyst_type.png'),
  'Heavy Armor': assetUrl('./assets/Types/armor_armorheavy_type.png'),
  'Light Armor': assetUrl('./assets/Types/armor_armorlight_type.png'),
  Clothes: assetUrl('./assets/Types/armor_clothes_type.png'),
  Helmet: assetUrl('./assets/Types/armor_helmet_type.png'),
  'Rogue Hat': assetUrl('./assets/Types/armor_roguehat_type.png'),
  'Magician Hat': assetUrl('./assets/Types/armor_hat_type.png'),
  Gauntlets: assetUrl('./assets/Types/armor_gauntlets_type.png'),
  Gloves: assetUrl('./assets/Types/armor_gloves_type.png'),
  'Heavy Footwear': assetUrl('./assets/Types/armor_boots_type.png'),
  'Light Footwear': assetUrl('./assets/Types/armor_shoes_type.png'),
  'Herbal Medicine': assetUrl('./assets/Types/accessory_herb_type.png'),
  Potion: assetUrl('./assets/Types/accessory_potion_type.png'),
  Spell: assetUrl('./assets/Types/accessory_scrolls_type.png'),
  Shield: assetUrl('./assets/Types/accessory_shield_type.png'),
  Cloak: assetUrl('./assets/Types/accessory_cloak_type.png'),
  Ring: assetUrl('./assets/Types/accessory_ring_type.png'),
  Amulet: assetUrl('./assets/Types/accessory_amulet_type.png'),
  Familiar: assetUrl('./assets/Types/accessory_familiar_type.png'),
  Aurasong: assetUrl('./assets/Types/weapon_aurasong_type.png'),
  Quiver: assetUrl('./assets/Types/weapon_quiver_type.png'),
  Idol: assetUrl('./assets/Types/accessory_idol_type.png'),
  Meal: assetUrl('./assets/Types/accessory_meal_type.png'),
  Dessert: assetUrl('./assets/Types/accessory_dessert_type.png'),
  Element: assetUrl('./assets/Types/enchantment_element_type.png'),
  Spirit: assetUrl('./assets/Types/enchantment_spirit_type.png'),
}

export function getGroupIconPath(group) {
  return GROUP_ICON_PATHS[group] || ''
}

export function getTypeIconPath(type) {
  return TYPE_ICON_PATHS[type] || ''
}

export function getBlueprintItemIconPath(item) {
  const type = item?.classification?.type
  if (isAurasongOrAmuletType(type)) {
    const mappedRelativePath = String(item?.iconMapping?.itemIconRelativePath || '').trim()
    if (!mappedRelativePath) {
      return ''
    }

    return assetUrl(mappedRelativePath)
  }

  return getTypeIconPath(type)
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