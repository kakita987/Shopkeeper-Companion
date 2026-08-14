const GROUP_KEY_BY_NAME = {
  Weapons: 'weapon',
  Armor: 'armor',
  Accessories: 'accessory',
  Enchantments: 'enchantment',
}

const GROUP_KEY_BY_ASSET_FOLDER = {
  Weapon: 'weapon',
  Armor: 'armor',
  Accessory: 'accessory',
  Enchantment: 'enchantment',
}

export function normalizeKeyPart(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function toCanonicalBlueprintLookupKey(group, type, tier, name) {
  const normalizedGroup = normalizeKeyPart(GROUP_KEY_BY_NAME[group] || group)
  const normalizedType = normalizeKeyPart(type)
  const normalizedName = normalizeKeyPart(name)
  const numericTier = Number(tier)

  if (!normalizedGroup || !normalizedType || !normalizedName || !Number.isInteger(numericTier) || numericTier < 0) {
    return ''
  }

  return `${normalizedGroup}::${normalizedType}::${numericTier}::${normalizedName}`
}

export function parseCanonicalAssetIdentity(relativePath) {
  const normalizedPath = String(relativePath || '').trim().replace(/\\/g, '/')
  if (!normalizedPath) {
    return null
  }

  const pathSegments = normalizedPath.split('/').filter(Boolean)
  const fileName = pathSegments.at(-1) || ''
  const groupSegment = GROUP_KEY_BY_ASSET_FOLDER[pathSegments.at(-2)] || ''
  const match = fileName.match(/^([a-z0-9_-]+)_t(\d+)_([a-z0-9_-]+)\.(?:png|jpe?g|gif|webp|svg)$/i)
  if (!match) {
    return null
  }

  const rawTypeSegment = match[1].toLowerCase()
  const typeSegment = normalizeKeyPart(rawTypeSegment)
  const tier = Number(match[2])
  const normalizedName = normalizeKeyPart(match[3])

  if (!Number.isInteger(tier) || tier < 0) {
    return null
  }

  if (!groupSegment || rawTypeSegment.startsWith(`${groupSegment}_`) || !typeSegment || !normalizedName) {
    return null
  }

  return {
    groupSegment,
    typeSegment,
    tier,
    normalizedName,
  }
}

export function parseCanonicalAssetLookupKey(relativePath) {
  const parsed = parseCanonicalAssetIdentity(relativePath)
  if (!parsed) {
    return ''
  }

  return `${parsed.groupSegment}::${parsed.typeSegment}::${parsed.tier}::${parsed.normalizedName}`
}
