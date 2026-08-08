const GROUP_KEY_BY_NAME = {
  Weapons: 'weapon',
  Armor: 'armor',
  Accessories: 'accessory',
  Enchantments: 'enchantment',
}

export function normalizeKeyPart(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
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

  const fileName = normalizedPath.split('/').pop() || ''
  const tieredMatch = fileName.match(/^([a-z0-9_-]+)_t(\d+)_([a-z0-9_-]+)\.(?:png|jpe?g|gif|webp|svg)$/i)
  const untieredMatch = fileName.match(/^([a-z0-9_-]+)_([a-z0-9_-]+)\.(?:png|jpe?g|gif|webp|svg)$/i)

  const match = tieredMatch || untieredMatch
  if (!match) {
    return null
  }

  const prefix = match[1] || ''
  const tier = tieredMatch ? Number(match[2]) : null
  const nameSegment = tieredMatch ? (match[3] || '') : (match[2] || '')

  if (tier !== null && (!Number.isInteger(tier) || tier < 0)) {
    return null
  }

  const prefixTokens = prefix.split('_').filter(Boolean)
  if (prefixTokens.length < 2) {
    return null
  }

  const groupSegment = normalizeKeyPart(prefixTokens[0])
  const typeSegment = normalizeKeyPart(prefixTokens.slice(1).join('_'))
  const normalizedName = normalizeKeyPart(nameSegment)

  if (!groupSegment || !typeSegment || !normalizedName) {
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
  if (!parsed || parsed.tier === null) {
    return ''
  }

  return `${parsed.groupSegment}::${parsed.typeSegment}::${parsed.tier}::${parsed.normalizedName}`
}
