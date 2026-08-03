import { cleanText } from './textUtils.js'
import { RESOURCE_LABELS } from './resourceLabels.js'

const CATEGORY_TYPE_LOOKUP = new Map(
  [
    {
      title: 'Weapons',
      types: ['Sword', 'Axe', 'Dagger', 'Mace', 'Spear', 'Bow', 'Wand', 'Staff', 'Gun', 'Crossbow', 'Instrument', 'Dual Wield', 'Catalyst'],
    },
    {
      title: 'Armor',
      types: ['Heavy Armor', 'Light Armor', 'Clothes', 'Helmet', 'Rogue Hat', 'Magician Hat', 'Gauntlets', 'Gloves', 'Heavy Footwear', 'Light Footwear'],
    },
    {
      title: 'Accessories',
      types: ['Herbal Remedy', 'Potion', 'Spell', 'Shield', 'Cloak', 'Ring', 'Amulet', 'Familiar', 'Aurasong', 'Quiver', 'Idol', 'Meal', 'Dessert'],
    },
    {
      title: 'Enchantments',
      types: ['Element', 'Spirit'],
    },
  ].flatMap((definition) => definition.types.map((type) => [normalizeTypeKey(type), { category: definition.title, type }]))
)

export function buildBlueprintItems(headers, rows, structuredBlueprints = []) {
  if (!rows.length && structuredBlueprints.length) {
    return structuredBlueprints.map((structuredData) => {
      const name = structuredData.meta?.name || 'Unknown'
      const category = structuredData.meta?.category || 'Unknown'
      const tier = structuredData.meta?.tier

      const classification = classifyBlueprint(category, name)
      return {
        name,
        meta: tier ? `Tier ${tier}` : 'No tier',
        structuredData,
        classification,
      }
    })
  }

  const nameIndex = getColumnIndex(headers, 'Name', 'Item Name', 'Blueprint Name')
  const categoryIndex = getColumnIndex(headers, 'Category', 'Item Category')
  const tierIndex = getColumnIndex(headers, 'Tier', 'Rank', 'Level')

  const resolvedNameIndex = nameIndex >= 0 ? nameIndex : 0
  const resolvedCategoryIndex = categoryIndex >= 0 ? categoryIndex : 1
  const resolvedTierIndex = tierIndex >= 0 ? tierIndex : -1

  const items = []

  rows.forEach((row, rowIndex) => {
    const name = getCellValue(row, resolvedNameIndex)
    const category = getCellValue(row, resolvedCategoryIndex)
    const tier = getCellValue(row, resolvedTierIndex)
    const structuredData = structuredBlueprints[rowIndex] || {}

    if (!name) {
      return
    }

    const classification = classifyBlueprint(category, name)
    items.push({
      name,
      meta: tier ? `Tier ${tier}` : 'No tier',
      structuredData,
      classification,
    })
  })

  return items
}

export function convertBlueprintRowToObject(headers, row) {
  const blueprint = {
    meta: {},
    economy: {},
    workers: [],
    materials: {
      resources: {},
      components: [],
    },
    stats: {},
    upgrades: {
      crafting: [],
      starforged: [],
      ascension: [],
      transcendence: [],
    },
  }

  const addMeta = (label, key, parser = (value) => value) => {
    const value = parser(getCellValue(row, getColumnIndex(headers, label)))
    if (value !== undefined && value !== '' && value !== '---') {
      blueprint.meta[key] = value
    }
  }

  const addEconomy = (label, key, parser = (value) => value) => {
    const value = parser(getCellValue(row, getColumnIndex(headers, label)))
    if (value !== undefined && value !== '' && value !== '---') {
      blueprint.economy[key] = value
    }
  }

  addMeta('Name', 'name', (value) => cleanText(value))
  addMeta('Category', 'category', (value) => cleanText(value))
  addMeta('Tier', 'tier', (value) => parseNumericValue(value))
  addMeta('Unlock Prerequisite', 'unlockPrerequisite', (value) => cleanText(value))
  addMeta('Research Scrolls', 'researchScrolls', (value) => parseNumericValue(value))
  addMeta('Antique Tokens', 'antiqueTokens', (value) => parseNumericValue(value))
  addMeta('Available as an Antique starting on (UTC)', 'availableAsAntiqueDate', (value) => cleanText(value))

  addEconomy('Value', 'value', (value) => parseNumericValue(value))
  addEconomy('Crafting Time (seconds)', 'craftingTimeSeconds', (value) => parseNumericValue(value))
  addEconomy('Value / Crafting Time', 'valueCraftTimeRatio', (value) => parseNumericValue(value))
  addEconomy('Merchant XP', 'merchantXp', (value) => parseNumericValue(value))
  addEconomy('Worker XP', 'workerXp', (value) => parseNumericValue(value))
  addEconomy('Fusion XP', 'fusionXp', (value) => parseNumericValue(value))
  addEconomy('Favor', 'favor', (value) => parseNumericValue(value))
  addEconomy('Airship Power', 'airshipPower', (value) => parseNumericValue(value))

  const energyLabels = [
    ['Discount Energy', 'discount'],
    ['Surcharge Energy', 'surcharge'],
    ['Suggest Energy', 'suggest'],
    ['Speed Up Energy', 'speedUp'],
  ]
  energyLabels.forEach(([label, key]) => {
    addEconomy(label, `energy${capitalize(key)}`, (value) => parseNumericValue(value))
  })
  if (Object.keys(blueprint.economy).length) {
    blueprint.economy.energy = {}
    Object.entries(blueprint.economy)
      .filter(([key]) => key.startsWith('energy'))
      .forEach(([key, value]) => {
        blueprint.economy.energy[key.replace(/^energy/, '').toLowerCase()] = value
        delete blueprint.economy[key]
      })
  }

  const workerNameIndexes = findColumnIndexes(headers, ['Required Worker'])
  const workerLevelIndexes = findColumnIndexes(headers, ['Worker Level'])

  workerNameIndexes.forEach((nameIndex, index) => {
    const levelIndex = workerLevelIndexes[index]
    const nameValue = cleanText(getCellValue(row, nameIndex))
    const levelValue = parseNumericValue(getCellValue(row, levelIndex))

    if (nameValue && nameValue !== '---') {
      blueprint.workers.push({
        name: nameValue,
        level: levelValue ?? undefined,
      })
    }
  })

  const componentIndexes = findColumnIndexes(headers, ['Component'])
  componentIndexes.forEach((componentIndex) => {
    const nameValue = cleanText(getCellValue(row, componentIndex))
    const qualityValue = cleanText(getCellValue(row, componentIndex + 1))
    const countValue = parseNumericValue(getCellValue(row, componentIndex + 2))

    if (nameValue && nameValue !== '---') {
      blueprint.materials.components.push({
        name: nameValue,
        quality: qualityValue || undefined,
        count: countValue ?? undefined,
      })
    }
  })

  const workerBoundary = Math.max(...workerLevelIndexes, ...workerNameIndexes, 0)
  const materialsStart = workerBoundary + 1
  const materialsEnd = componentIndexes[0] ?? headers.length
  const resourceValues = []
  for (let index = materialsStart; index < materialsEnd; index += 1) {
    const value = getCellValue(row, index)
    if (!isMeaningfulValue(value)) {
      continue
    }
    resourceValues.push(value)
  }

  if (resourceValues.length) {
    resourceValues.forEach((value, index) => {
      const parsedValue = parseNumericValue(value)
      const normalizedValue = parsedValue ?? cleanText(value)
      if (normalizedValue !== undefined && normalizedValue !== '' && normalizedValue !== '---') {
        const resourceLabel = RESOURCE_LABELS[index] || `Resource ${index + 1}`
        blueprint.materials.resources[resourceLabel] = normalizedValue
      }
    })
  }

  const addStat = (label, key) => {
    const value = getCellValue(row, getColumnIndex(headers, label))
    const parsedValue = parseNumericValue(value)
    if (parsedValue !== undefined) {
      blueprint.stats[key] = parsedValue
    } else if (isMeaningfulValue(value)) {
      blueprint.stats[key] = cleanText(value)
    }
  }

  addStat('ATK', 'atk')
  addStat('DEF', 'def')
  addStat('HP', 'hp')
  addStat('EVA', 'eva')
  addStat('CRIT', 'crit')
  addStat('Elemental Affinity', 'elementalAffinity')
  addStat('Spirit Affinity', 'spiritAffinity')
  addStat('Built-In Element', 'builtInElement')
  addStat('Built-In Spirit', 'builtInSpirit')

  const upgradeGroups = [
    { key: 'crafting', labelPrefix: 'Crafting Upgrade' },
    { key: 'starforged', labelPrefix: 'Starforged Milestone' },
    { key: 'ascension', labelPrefix: 'Ascension Upgrade' },
    { key: 'transcendence', labelPrefix: 'Transcendence Upgrade' },
  ]

  upgradeGroups.forEach(({ key, labelPrefix }) => {
    for (let index = 1; index <= 5; index += 1) {
      const upgradeIndex = getColumnIndex(headers, `${labelPrefix} ${index}`)
      const countIndex = upgradeIndex + 1
      const upgradeValue = cleanText(getCellValue(row, upgradeIndex))
      const countValue = parseNumericValue(getCellValue(row, countIndex))

      if (upgradeValue || countValue !== undefined) {
        blueprint.upgrades[key].push({
          name: upgradeValue || undefined,
          count: countValue ?? undefined,
        })
      }
    }
  })

  return blueprint
}

function isMeaningfulValue(value) {
  if (value === null || value === undefined) {
    return false
  }

  const text = String(value).trim()
  return Boolean(text) && text !== '---'
}

function parseNumericValue(value) {
  if (value === null || value === undefined) {
    return undefined
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '---') {
      return undefined
    }

    const normalized = trimmed.replace(/,/g, '')
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? undefined : parsed
  }

  return undefined
}

function findColumnIndexes(headers, labels) {
  const targetLabels = labels.map((label) => label.toLowerCase().trim())

  return headers.reduce((matches, header, index) => {
    if (targetLabels.includes(header.toLowerCase().trim())) {
      matches.push(index)
    }
    return matches
  }, [])
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getColumnIndex(headers, ...labels) {
  for (const label of labels) {
    const index = headers.findIndex((header) => (header || '').toString().trim().toLowerCase() === label.toLowerCase())
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

function classifyBlueprint(type, name) {
  const normalizedType = (type || '').toString().trim()
  const normalizedName = (name || '').toString().trim()
  const haystack = `${normalizedType} ${normalizedName}`.toLowerCase()
  const normalizedTypeKey = normalizeTypeKey(normalizedType)

  if (normalizedTypeKey === 'potion' && /herbal|remedy/.test(haystack)) {
    return { category: 'Accessories', type: 'Herbal Remedy' }
  }

  if (normalizedTypeKey === 'enchantment' || normalizedTypeKey === 'enchantments') {
    return { category: 'Enchantments', type: resolveEnchantmentType(normalizedName) }
  }

  const directMatch = CATEGORY_TYPE_LOOKUP.get(normalizedTypeKey)
  if (directMatch) {
    return directMatch
  }

  if (/enchant|spirit|element/i.test(haystack)) {
    return { category: 'Enchantments', type: resolveEnchantmentType(normalizedName) }
  }

  if (/sword|axe|dagger|mace|spear|bow|wand|staff|gun|crossbow|instrument|dual wield|catalyst|weapon/i.test(haystack)) {
    return { category: 'Weapons', type: resolveCanonicalType('Weapons', normalizedType, normalizedName) }
  }

  if (/herbal|potion|spell|shield|cloak|ring|amulet|familiar|idol|quiver|aura|meal|dessert|remedy|accessory/i.test(haystack)) {
    return { category: 'Accessories', type: resolveCanonicalType('Accessories', normalizedType, normalizedName) }
  }

  if (/armor|helmet|hat|glove|gauntlet|footwear|heavy armor|light armor|clothes|robe|boot|shoe/i.test(haystack)) {
    return { category: 'Armor', type: resolveCanonicalType('Armor', normalizedType, normalizedName) }
  }

  return { category: 'Accessories', type: resolveCanonicalType('Accessories', normalizedType, normalizedName) }
}

function normalizeTypeKey(value) {
  return (value || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function resolveEnchantmentType(name) {
  return /spirit/i.test(name) ? 'Spirit' : 'Element'
}

function resolveCanonicalType(category, type, name) {
  const haystack = `${type || ''} ${name || ''}`.toLowerCase()

  if (category === 'Weapons') {
    if (/dual\s*wield/.test(haystack)) return 'Dual Wield'
    if (/crossbow/.test(haystack)) return 'Crossbow'
    if (/instrument/.test(haystack)) return 'Instrument'
    if (/catalyst/.test(haystack)) return 'Catalyst'
    if (/sword/.test(haystack)) return 'Sword'
    if (/axe/.test(haystack)) return 'Axe'
    if (/dagger/.test(haystack)) return 'Dagger'
    if (/mace/.test(haystack)) return 'Mace'
    if (/spear/.test(haystack)) return 'Spear'
    if (/bow/.test(haystack)) return 'Bow'
    if (/wand/.test(haystack)) return 'Wand'
    if (/staff/.test(haystack)) return 'Staff'
    if (/gun/.test(haystack)) return 'Gun'
    return 'Sword'
  }

  if (category === 'Armor') {
    if (/heavy\s*armor|heavyarmor|plate|mail|cuirass/.test(haystack)) return 'Heavy Armor'
    if (/light\s*armor|lightarmor/.test(haystack)) return 'Light Armor'
    if (/clothes|robe/.test(haystack)) return 'Clothes'
    if (/rogue/.test(haystack)) return 'Rogue Hat'
    if (/magician|mage|wizard|sorcer/.test(haystack)) return 'Magician Hat'
    if (/gauntlet/.test(haystack)) return 'Gauntlets'
    if (/glove/.test(haystack)) return 'Gloves'
    if (/heavy\s*footwear|heavyfootwear|boot|shoe/.test(haystack)) return 'Heavy Footwear'
    if (/light\s*footwear|lightfootwear|sandals/.test(haystack)) return 'Light Footwear'
    if (/helmet|hood/.test(haystack)) return 'Helmet'
    return 'Clothes'
  }

  if (category === 'Accessories') {
    if (/herbal|remedy/.test(haystack)) return 'Herbal Remedy'
    if (/potion/.test(haystack)) return 'Potion'
    if (/spell/.test(haystack)) return 'Spell'
    if (/shield/.test(haystack)) return 'Shield'
    if (/cloak/.test(haystack)) return 'Cloak'
    if (/ring/.test(haystack)) return 'Ring'
    if (/amulet/.test(haystack)) return 'Amulet'
    if (/familiar/.test(haystack)) return 'Familiar'
    if (/aura\s*song|aurasong/.test(haystack)) return 'Aurasong'
    if (/quiver/.test(haystack)) return 'Quiver'
    if (/idol/.test(haystack)) return 'Idol'
    if (/meal/.test(haystack)) return 'Meal'
    if (/dessert/.test(haystack)) return 'Dessert'
    return 'Potion'
  }

  return type || 'Unknown'
}