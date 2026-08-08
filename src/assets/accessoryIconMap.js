import { getTypeIconPath } from '../blueprintIcons.js'
import { normalizeKeyPart } from '../iconKey.js'
import { BLUEPRINT_GROUP_TYPE_ORDER } from './blueprintTypeOrder.js'
import { ACCESSORY_ITEM_ICON_ASSETS } from './accessoryItemIconInventory.js'

const TARGET_GROUP = 'Accessories'
const TARGET_TYPES = ['Amulet', 'Aurasong', 'Spell', 'Shield', 'Quiver', 'Potion', 'Ring', 'Meal', 'Herbal Medicine', 'Familiar', 'Dessert', 'Cloak']
const TARGET_TYPE_SET = new Set(TARGET_TYPES)
const ACCESSORY_TYPE_KEYS = new Set(['accessory', 'accessories'])
const ACCESSORY_TYPE_ORDER = buildAccessoryTypeOrder()
const ITEM_ICON_INDEX = buildItemIconIndex()
const ITEM_ICON_TIER_INDEX = buildItemIconTierIndex()

function buildAccessoryTypeOrder() {
  const accessoriesDefinition = BLUEPRINT_GROUP_TYPE_ORDER.find((definition) => definition.group === TARGET_GROUP)
  const typeOrder = new Map((accessoriesDefinition?.types || []).map((type, index) => [type, index]))

  const missingTypes = TARGET_TYPES.filter((type) => !typeOrder.has(type))
  if (missingTypes.length) {
    throw new Error(`Missing blueprint type order definitions for: ${missingTypes.join(', ')}`)
  }

  return typeOrder
}

function toTierNumber(value) {
  const parsed = Number(value)
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed
  }

  return null
}

function readTierFromMeta(metaText) {
  const tierMatch = String(metaText || '').match(/tier\s+(\d+)/i)
  return tierMatch?.[1] ? Number(tierMatch[1]) : null
}

function getBlueprintTier(item) {
  const structuredTier = toTierNumber(item?.structuredData?.meta?.tier)
  if (structuredTier !== null) {
    return structuredTier
  }

  return readTierFromMeta(item?.meta)
}

function getColumnIndex(headers = [], ...labels) {
  const normalizedHeaders = headers.map((header) => String(header || '').trim().toLowerCase())

  for (const label of labels) {
    const index = normalizedHeaders.findIndex((header) => header === label.toLowerCase())
    if (index !== -1) {
      return index
    }
  }

  return -1
}

function getCellValue(row, index) {
  if (!Array.isArray(row) || index < 0) {
    return ''
  }

  const cell = row[index]
  if (typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') {
    return cell
  }

  if (cell && typeof cell === 'object') {
    return cell.v ?? ''
  }

  return ''
}

function resolveTargetType(type, name = '', tier = null) {
  const normalized = String(type || '').trim().toLowerCase()
  if (normalized === 'amulet') {
    return 'Amulet'
  }

  if (normalized === 'aurasong') {
    return 'Aurasong'
  }

  if (normalized === 'spell') {
    return 'Spell'
  }

  if (normalized === 'quiver') {
    return 'Quiver'
  }

  if (normalized === 'potion') {
    return 'Potion'
  }

  if (normalized === 'ring') {
    return 'Ring'
  }

  if (normalized === 'meal') {
    return 'Meal'
  }

  if (normalized === 'herbal medicine') {
    return 'Herbal Medicine'
  }

  if (normalized === 'familiar') {
    return 'Familiar'
  }

  if (normalized === 'dessert') {
    return 'Dessert'
  }

  if (normalized === 'cloak') {
    return 'Cloak'
  }

  if (!ACCESSORY_TYPE_KEYS.has(normalized)) {
    return ''
  }

  const inferredType = inferTypeBySimilarity(name, tier)
  return inferredType || ''
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
  const a = normalizeNameForKey(left)
  const b = normalizeNameForKey(right)
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

  const dice = (2 * shared) / (bigramsA.size + bigramsB.size)

  if (a.includes(b) || b.includes(a)) {
    return Math.max(dice, 0.65)
  }

  return dice
}

function getTierEntriesByType(type, tier) {
  if (tier === null) {
    return []
  }

  const key = `${type}::${tier}`
  return ITEM_ICON_TIER_INDEX.get(key) || []
}

function pickBestEntryByName(name, entries = []) {
  if (!entries.length) {
    return null
  }

  const nameCandidates = buildNameCandidates(name)
  if (!nameCandidates.length) {
    return null
  }

  let bestEntry = null
  let bestScore = -1

  entries.forEach((entry) => {
    const score = Math.max(...nameCandidates.map((candidate) => similarityScore(candidate, entry.itemKey)))
    if (score > bestScore) {
      bestScore = score
      bestEntry = entry
    }
  })

  return bestEntry
}

function inferTypeBySimilarity(name, tier = null) {
  const tierTypeAvailability = TARGET_TYPES
    .map((targetType) => ({
      type: targetType,
      entries: getTierEntriesByType(targetType, tier),
    }))
    .filter((entry) => entry.entries.length > 0)

  if (tierTypeAvailability.length === 1) {
    return tierTypeAvailability[0].type
  }

  const typeScores = TARGET_TYPES.map((targetType) => {
    const tierEntries = getTierEntriesByType(targetType, tier)
    const bestTierEntry = pickBestEntryByName(name, tierEntries)
    const rawScore = bestTierEntry ? similarityScore(name, bestTierEntry.itemKey) : 0
    // Normalize for candidate-pool size so larger type pools are less likely to win on random overlap.
    const penalty = Math.log2(Math.max(1, tierEntries.length + 1)) * 0.03

    return {
      type: targetType,
      rawScore,
      adjustedScore: Math.max(0, rawScore - penalty),
    }
  }).sort((left, right) => right.adjustedScore - left.adjustedScore)

  if (typeScores.length < 2) {
    return typeScores[0]?.adjustedScore > 0 ? typeScores[0].type : ''
  }

  const winner = typeScores[0]
  const runnerUp = typeScores[1]
  if (winner.adjustedScore <= 0) {
    return winner.type
  }

  if (winner.adjustedScore === runnerUp.adjustedScore) {
    return winner.type
  }

  const adjustedGap = winner.adjustedScore - runnerUp.adjustedScore
  const highConfidence = winner.rawScore >= 0.55
  const marginConfidence = winner.rawScore >= 0.4 && adjustedGap >= 0.08
  if (!highConfidence && !marginConfidence) {
    return winner.type
  }

  return winner.type
}

function normalizeNameForKey(name) {
  return normalizeKeyPart(name)
}

function buildNameCandidates(name) {
  const compact = normalizeNameForKey(name)
  if (!compact) {
    return []
  }

  return [compact]
}

function buildItemIconIndex() {
  const index = new Map()

  ACCESSORY_ITEM_ICON_ASSETS.forEach((entry) => {
    const type = String(entry?.type || '').trim()
    const tier = toTierNumber(entry?.tier)
    const itemKey = String(entry?.itemKey || '').trim()
    const relativePath = String(entry?.relativePath || '').trim()

    if (!TARGET_TYPE_SET.has(type) || tier === null || !itemKey || !relativePath) {
      return
    }

    const key = `${type}::${tier}::${normalizeNameForKey(itemKey)}`
    index.set(key, relativePath)
  })

  return index
}

function buildItemIconTierIndex() {
  const index = new Map()

  ACCESSORY_ITEM_ICON_ASSETS.forEach((entry) => {
    const type = String(entry?.type || '').trim()
    const tier = toTierNumber(entry?.tier)
    const relativePath = String(entry?.relativePath || '').trim()

    if (!TARGET_TYPE_SET.has(type) || tier === null || !relativePath) {
      return
    }

    const key = `${type}::${tier}`
    const existing = index.get(key) || []
    existing.push({
      itemKey: String(entry?.itemKey || '').trim(),
      relativePath,
    })
    index.set(key, existing)
  })

  return index
}

function getMappedItemIconRelativePath(name, type, tier) {
  const nameCandidates = buildNameCandidates(name)
  if (nameCandidates.length) {
    for (const candidate of nameCandidates) {
      const key = `${type}::${tier}::${candidate}`
      const match = ITEM_ICON_INDEX.get(key)
      if (match) {
        return match
      }
    }
  }

  return ''
}

function getTypeOrder(type) {
  const index = ACCESSORY_TYPE_ORDER.get(type)
  return Number.isInteger(index) ? index : Number.MAX_SAFE_INTEGER
}

function compareRows(left, right) {
  const typeDelta = getTypeOrder(left.type) - getTypeOrder(right.type)
  if (typeDelta !== 0) {
    return typeDelta
  }

  const tierDelta = left.tier - right.tier
  if (tierDelta !== 0) {
    return tierDelta
  }

  return left.blueprintName.localeCompare(right.blueprintName)
}

function toMapRow(item) {
  const name = String(item?.name || '').trim()
  const group = String(item?.classification?.group || '').trim()
  const type = String(item?.classification?.type || '').trim()
  const tier = getBlueprintTier(item)

  if (!name || group !== TARGET_GROUP || !TARGET_TYPE_SET.has(type) || tier === null) {
    return null
  }

  return {
    blueprintName: name,
    tier,
    group,
    type,
    typeIconPath: getTypeIconPath(type),
    itemIconRelativePath: getMappedItemIconRelativePath(name, type, tier),
    lookupKey: `${normalizeNameForKey(name)}::${tier}`,
  }
}

export function buildAurasongAmuletIconMapFromItems(items = []) {
  return items
    .map((item) => toMapRow(item))
    .filter(Boolean)
    .sort(compareRows)
}

export function buildAurasongAmuletIconMapFromImport(headers = [], rows = [], structuredBlueprints = []) {
  const nameIndex = getColumnIndex(headers, 'Name', 'Item Name', 'Blueprint Name')
  const typeIndex = getColumnIndex(headers, 'Type', 'Category', 'Item Type', 'Item Category')
  const tierIndex = getColumnIndex(headers, 'Tier', 'Rank', 'Level')

  const resolvedNameIndex = nameIndex >= 0 ? nameIndex : 0
  const resolvedTypeIndex = typeIndex >= 0 ? typeIndex : 1
  const resolvedTierIndex = tierIndex >= 0 ? tierIndex : -1

  const mapRows = []

  rows.forEach((row, rowIndex) => {
    const name = String(getCellValue(row, resolvedNameIndex) || '').trim()
    if (!name) {
      return
    }

    const rowTier = toTierNumber(getCellValue(row, resolvedTierIndex))
    const structuredTier = toTierNumber(structuredBlueprints?.[rowIndex]?.meta?.tier)
    const tier = structuredTier ?? rowTier
    const targetType = resolveTargetType(getCellValue(row, resolvedTypeIndex), name, tier)

    if (!targetType) {
      return
    }

    if (tier === null) {
      return
    }

    mapRows.push({
      blueprintName: name,
      tier,
      group: TARGET_GROUP,
      type: targetType,
      typeIconPath: getTypeIconPath(targetType),
      itemIconRelativePath: getMappedItemIconRelativePath(name, targetType, tier),
      lookupKey: `${normalizeNameForKey(name)}::${tier}`,
    })
  })

  return mapRows.sort(compareRows)
}

export function indexAurasongAmuletIconMap(rows = []) {
  return rows.reduce((index, row) => {
    index[row.lookupKey] = row
    return index
  }, {})
}

export function applyAurasongAmuletTypeMap(items = [], rows = []) {
  const rowIndex = indexAurasongAmuletIconMap(rows)

  return items.map((item) => {
    const name = String(item?.name || '').trim()
    const tier = getBlueprintTier(item)

    if (!name || tier === null) {
      return item
    }

    const lookupKey = `${normalizeNameForKey(name)}::${tier}`
    const mapped = rowIndex[lookupKey]
    if (!mapped) {
      return item
    }

    const baseClassification = item?.classification && typeof item.classification === 'object'
      ? item.classification
      : {}

    return {
      ...item,
      classification: {
        ...baseClassification,
        group: mapped.group,
        type: mapped.type,
      },
      iconMapping: {
        ...(item?.iconMapping && typeof item.iconMapping === 'object' ? item.iconMapping : {}),
        itemIconRelativePath: mapped.itemIconRelativePath || '',
      },
    }
  })
}

function escapeCsv(value) {
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export function toAurasongAmuletIconMapCsv(rows = []) {
  const header = ['blueprintName', 'tier', 'group', 'type', 'typeIconPath', 'itemIconRelativePath', 'lookupKey']
  const lines = [header.join(',')]

  rows.forEach((row) => {
    lines.push([
      escapeCsv(row.blueprintName),
      escapeCsv(row.tier),
      escapeCsv(row.group),
      escapeCsv(row.type),
      escapeCsv(row.typeIconPath),
      escapeCsv(row.itemIconRelativePath || ''),
      escapeCsv(row.lookupKey),
    ].join(','))
  })

  return lines.join('\n')
}