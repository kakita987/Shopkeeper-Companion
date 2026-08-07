import { cleanText, toInventoryCount } from './textUtils.js'
import { BLUEPRINT_GROUP_TYPE_ORDER } from './assets/blueprintTypeOrder.js'

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files'
const README_SHEET_TITLE = 'ReadMe'
const WORKBOOK_SHEET_TITLES = ['ReadMe', 'Weapons', 'Armor', 'Accessories', 'Enchantments', 'Saved Views', 'Settings']
const BLUEPRINT_GROUP_TITLES = ['Weapons', 'Armor', 'Accessories', 'Enchantments']

const README_ROWS = [
  ['Shopkeeper Companion - User Data Sheet'],
  [''],
  ['How sync works'],
  ['- This sheet is bi-directional: app changes sync here, and your edits here sync back into the app.'],
  ['- Blueprint rows are matched by Blueprint Name, not by row position.'],
  ['- Use TRUE/FALSE for checkbox-style fields and whole numbers for inventory counts.'],
  [''],
  ['Tabs'],
  ['1) Weapons / Armor / Accessories / Enchantments: blueprint data plus per-blueprint user progress.'],
  ['2) Saved Views: your saved filter presets.'],
  ['3) Settings: tracked upgrades and small app metadata.'],
  [''],
  ['Tips'],
  ['- Bulk edit with copy/paste or formulas, then click Sync Now in the app.'],
  ['- Keep the header row names unchanged so sync can parse correctly.'],
]

const PROGRESS_COLUMNS = [
  { key: 'inventoryNormal', label: 'Inventory Normal' },
  { key: 'inventorySuperior', label: 'Inventory Superior' },
  { key: 'inventoryFlawless', label: 'Inventory Flawless' },
  { key: 'inventoryEpic', label: 'Inventory Epic' },
  { key: 'inventoryLegendary', label: 'Inventory Legendary' },
  { key: 'owned', label: 'Owned' },
  { key: 'starforge', label: 'Starforge' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'improve', label: 'Improve' },
  { key: 'collectionSuperior', label: 'Collection Superior' },
  { key: 'collectionFlawless', label: 'Collection Flawless' },
  { key: 'collectionEpic', label: 'Collection Epic' },
  { key: 'collectionLegendary', label: 'Collection Legendary' },
]

const MASTER_BLUEPRINT_COLUMNS = [
  { key: 'blueprintName', label: 'Blueprint Name' },
  { key: 'type', label: 'Type' },
  { key: 'tier', label: 'Tier' },
]

const GROUP_TYPE_ORDER_INDEX = new Map(
  BLUEPRINT_GROUP_TYPE_ORDER.map((definition) => [
    definition.group,
    new Map(definition.types.map((type, index) => [type.toLowerCase(), index])),
  ])
)

function getSyncWorkbookSchemaEntries() {
  return [
    { title: README_SHEET_TITLE, headers: [] },
    { title: 'Weapons', headers: getBlueprintHeaders() },
    { title: 'Armor', headers: getBlueprintHeaders() },
    { title: 'Accessories', headers: getBlueprintHeaders() },
    { title: 'Enchantments', headers: getBlueprintHeaders() },
    { title: 'Saved Views', headers: ['id', 'name', 'dependency', 'ownership', 'inventory', 'mastered', 'collectionBook'] },
    { title: 'Settings', headers: ['key', 'value'] },
  ]
}

function getBlueprintHeaders() {
  return [
    ...MASTER_BLUEPRINT_COLUMNS.map((column) => column.label),
    ...PROGRESS_COLUMNS.map((column) => column.label),
  ]
}

const BLUEPRINT_SCHEMA_HEADERS = getBlueprintHeaders()

function toSheetRange(sheetTitle, range) {
  return `'${sheetTitle}'!${range}`
}

function columnIndexToLetter(index) {
  let current = Number(index)
  if (!Number.isFinite(current) || current < 1) {
    return 'A'
  }

  let result = ''
  while (current > 0) {
    const remainder = (current - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    current = Math.floor((current - 1) / 26)
  }

  return result
}

function parseBooleanCell(value) {
  if (typeof value === 'boolean') {
    return value
  }

  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

function formatBooleanCell(value) {
  return Boolean(value) ? 'TRUE' : 'FALSE'
}

function formatInventoryCell(value) {
  return String(toInventoryCount(value))
}

function isCollectionBookQualityComplete(progress = {}, quality) {
  if (progress?.collectionBookComplete) {
    return true
  }

  if (Array.isArray(progress?.collectionBook)) {
    return progress.collectionBook.some((value) => String(value || '').trim().toLowerCase() === quality)
  }

  return Boolean(progress?.collectionBook && progress.collectionBook[quality])
}

function getProgressCount(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function clampProgressCount(value, maxValue) {
  return Math.min(getProgressCount(value), maxValue)
}

function toCombinedMilestones(progress = {}) {
  const baseMilestones = clampProgressCount(progress?.milestones, 5)
  const starforgeProgress = clampProgressCount(progress?.starforge, 5)
  if (starforgeProgress > 0) {
    return Math.min(10, 5 + starforgeProgress)
  }

  return baseMilestones
}

function toCombinedImprove(progress = {}) {
  const ascensionProgress = clampProgressCount(progress?.ascension, 3)
  const transcendenceProgress = clampProgressCount(progress?.transcendence, 3)
  if (transcendenceProgress > 0) {
    return Math.min(6, 3 + transcendenceProgress)
  }

  return ascensionProgress
}

function normalizeHeaderSet(headers = []) {
  return new Set(
    (Array.isArray(headers) ? headers : [])
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean)
  )
}

function normalizeSheetRows(values = []) {
  const rows = Array.isArray(values) ? values : []
  return rows.filter((row) => Array.isArray(row) && row.some((cell) => cell !== '' && cell !== null && cell !== undefined))
}

function getHeaderIndex(headers = [], labels = []) {
  const normalizedLabels = labels.map((label) => String(label || '').trim().toLowerCase())
  return headers.findIndex((header) => normalizedLabels.includes(String(header || '').trim().toLowerCase()))
}

function getRowValue(row = [], headers = [], labels = []) {
  const index = getHeaderIndex(headers, labels)
  if (index < 0 || !Array.isArray(row)) {
    return ''
  }

  return row[index] ?? ''
}

function getBlueprintTypeOrderIndex(groupTitle, blueprintType) {
  const typeOrder = GROUP_TYPE_ORDER_INDEX.get(groupTitle) || new Map()
  const normalizedType = cleanText(blueprintType).toLowerCase()
  const index = typeOrder.get(normalizedType)
  return index === undefined ? Number.MAX_SAFE_INTEGER : index
}

function getTierOrderIndex(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.MAX_SAFE_INTEGER
}

function isBlueprintRowsOutOfOrder(headerRow = [], dataRows = [], groupTitle = '') {
  let previousTypeIndex = -1
  let previousTierIndex = -1

  for (const row of dataRows) {
    if (!Array.isArray(row)) {
      continue
    }

    const blueprintName = cleanText(getRowValue(row, headerRow, ['Blueprint Name', 'blueprintName', 'Name']))
    if (!blueprintName) {
      continue
    }

    const blueprintType = getRowValue(row, headerRow, ['Type', 'Category', 'Item Type', 'Item Category'])
    const typeIndex = getBlueprintTypeOrderIndex(groupTitle, blueprintType)
    const tierValue = getRowValue(row, headerRow, ['Tier', 'Rank', 'Level'])
    const tierIndex = getTierOrderIndex(tierValue)

    if (typeIndex < previousTypeIndex) {
      return true
    }

    if (typeIndex !== previousTypeIndex) {
      previousTypeIndex = typeIndex
      previousTierIndex = tierIndex
      continue
    }

    if (tierIndex < previousTierIndex) {
      return true
    }

    previousTierIndex = tierIndex
  }

  return false
}

function createDefaultBlueprintProgress() {
  return {
    owned: false,
    inventory: {
      normal: 0,
      superior: 0,
      flawless: 0,
      epic: 0,
      legendary: 0,
    },
    milestones: 0,
    ascension: 0,
    starforgeUnlocked: false,
    starforge: 0,
    transcendence: 0,
    collectionBookComplete: false,
  }
}

export function parseWorkbookBlueprintProgress(workbookBlueprintProgress = [], existingProgress = {}) {
  const normalizedExisting = existingProgress && typeof existingProgress === 'object' && !Array.isArray(existingProgress)
    ? existingProgress
    : {}

  const nextProgress = { ...normalizedExisting }
  const sheetEntries = Array.isArray(workbookBlueprintProgress)
    ? [[null, workbookBlueprintProgress]]
    : Object.entries(workbookBlueprintProgress || {})

  sheetEntries.forEach(([, rows]) => {
    const normalizedRows = Array.isArray(rows) ? rows : []
    const headerRow = Array.isArray(normalizedRows[0]) ? normalizedRows[0] : []
    const dataRows = normalizedRows.slice(1)

    dataRows.forEach((row) => {
      const blueprintName = cleanText(getRowValue(row, headerRow, ['Blueprint Name', 'blueprintName', 'Name']))
      if (!blueprintName) {
        return
      }

      const currentProgress = nextProgress[blueprintName] || createDefaultBlueprintProgress()
      const nextInventory = {
        ...(currentProgress.inventory || {}),
      }

      const inventoryFields = [
        ['Inventory Normal', 'normal'],
        ['Inventory Superior', 'superior'],
        ['Inventory Flawless', 'flawless'],
        ['Inventory Epic', 'epic'],
        ['Inventory Legendary', 'legendary'],
      ]

      inventoryFields.forEach(([label, key]) => {
        const rawValue = getRowValue(row, headerRow, [label])
        if (rawValue !== '') {
          nextInventory[key] = toInventoryCount(rawValue)
        }
      })

      const ownedValue = getRowValue(row, headerRow, ['Owned', 'owned'])
      if (ownedValue !== '') {
        currentProgress.owned = parseBooleanCell(ownedValue)
      }

      currentProgress.inventory = nextInventory

      const normalizedHeaders = normalizeHeaderSet(headerRow)
      const hasImproveColumn = normalizedHeaders.has('improve')

      if (hasImproveColumn) {
        const milestonesCombinedValue = getRowValue(row, headerRow, ['Milestones', 'milestones'])
        if (milestonesCombinedValue !== '') {
          const combinedMilestones = clampProgressCount(milestonesCombinedValue, 10)
          currentProgress.milestones = Math.min(combinedMilestones, 5)
          currentProgress.starforge = combinedMilestones > 5 ? combinedMilestones - 5 : 0
        }

        const improveCombinedValue = getRowValue(row, headerRow, ['Improve', 'improve'])
        if (improveCombinedValue !== '') {
          const combinedImprove = clampProgressCount(improveCombinedValue, 6)
          currentProgress.ascension = Math.min(combinedImprove, 3)
          currentProgress.transcendence = combinedImprove > 3 ? combinedImprove - 3 : 0
        }

        const starforgeBooleanValue = getRowValue(row, headerRow, ['Starforge', 'starforge'])
        if (starforgeBooleanValue !== '') {
          currentProgress.starforgeUnlocked = parseBooleanCell(starforgeBooleanValue)
        }

        if (currentProgress.starforge > 0) {
          currentProgress.starforgeUnlocked = true
        }
      } else {
        const milestoneFields = [
          [['Milestones', 'Milestone', 'milestones'], 'milestones'],
          ['Ascension', 'ascension'],
          ['Starforge', 'starforge'],
          ['Transcendence', 'transcendence'],
        ]

        const starforgeUnlockedValue = getRowValue(row, headerRow, ['Starforge Unlocked', 'starforgeUnlocked'])
        if (starforgeUnlockedValue !== '') {
          currentProgress.starforgeUnlocked = parseBooleanCell(starforgeUnlockedValue)
        }

        milestoneFields.forEach(([labels, key]) => {
          const lookupLabels = Array.isArray(labels) ? labels : [labels]
          const rawValue = getRowValue(row, headerRow, lookupLabels)
          if (rawValue !== '') {
            currentProgress[key] = getProgressCount(rawValue)
          }
        })

        if (starforgeUnlockedValue === '' && getProgressCount(currentProgress.starforge) > 0) {
          currentProgress.starforgeUnlocked = true
        }
      }

      const collectionBookFields = [
        ['Collection Superior', 'superior'],
        ['Collection Flawless', 'flawless'],
        ['Collection Epic', 'epic'],
        ['Collection Legendary', 'legendary'],
      ]

      const collectionBook = {
        ...(currentProgress.collectionBook || {}),
      }

      collectionBookFields.forEach(([label, key]) => {
        const rawValue = getRowValue(row, headerRow, [label])
        if (rawValue !== '') {
          collectionBook[key] = parseBooleanCell(rawValue)
        }
      })

      currentProgress.collectionBook = collectionBook
      currentProgress.collectionBookComplete = Boolean(
        currentProgress.collectionBook?.superior &&
        currentProgress.collectionBook?.flawless &&
        currentProgress.collectionBook?.epic &&
        currentProgress.collectionBook?.legendary
      )

      nextProgress[blueprintName] = currentProgress
    })
  })

  return nextProgress
}

function trimTrailingEmptyRows(rows = []) {
  const trimmed = [...rows]
  while (trimmed.length > 0) {
    const lastRow = trimmed[trimmed.length - 1]
    if (Array.isArray(lastRow) && lastRow.some((cell) => cell !== '' && cell !== null && cell !== undefined)) {
      break
    }
    trimmed.pop()
  }
  return trimmed
}

function trimTrailingEmptyColumns(rows = []) {
  const trimmed = rows.map((row) => [...row])
  if (!trimmed.length) {
    return trimmed
  }

  let lastNonEmptyColumnIndex = -1
  trimmed.forEach((row) => {
    row.forEach((cell, index) => {
      if (cell !== '' && cell !== null && cell !== undefined) {
        lastNonEmptyColumnIndex = Math.max(lastNonEmptyColumnIndex, index)
      }
    })
  })

  if (lastNonEmptyColumnIndex < 0) {
    return []
  }

  return trimmed.map((row) => row.slice(0, lastNonEmptyColumnIndex + 1))
}

function buildWorkbookSheetRows(headers = [], rows = []) {
  const sheetRows = [headers, ...rows]
  const trimmedRows = trimTrailingEmptyRows(trimTrailingEmptyColumns(sheetRows))
  if (!trimmedRows.length) {
    return []
  }
  return trimmedRows
}

function buildBlueprintRow(item = {}, progress = {}) {
  const structuredData = item?.structuredData || {}
  const classification = item?.classification || {}

  const baseValues = {
    blueprintName: item?.name || '',
    type: structuredData?.meta?.type || structuredData?.meta?.category || classification?.type || '',
    tier: structuredData?.meta?.tier ?? '',
  }

  const progressValues = {
    inventoryNormal: formatInventoryCell(progress?.inventory?.normal ?? 0),
    inventorySuperior: formatInventoryCell(progress?.inventory?.superior ?? 0),
    inventoryFlawless: formatInventoryCell(progress?.inventory?.flawless ?? 0),
    inventoryEpic: formatInventoryCell(progress?.inventory?.epic ?? 0),
    inventoryLegendary: formatInventoryCell(progress?.inventory?.legendary ?? 0),
    owned: formatBooleanCell(progress?.owned),
    milestones: formatInventoryCell(toCombinedMilestones(progress)),
    improve: formatInventoryCell(toCombinedImprove(progress)),
    starforge: formatBooleanCell(progress?.starforgeUnlocked),
    collectionSuperior: formatBooleanCell(isCollectionBookQualityComplete(progress, 'superior')),
    collectionFlawless: formatBooleanCell(isCollectionBookQualityComplete(progress, 'flawless')),
    collectionEpic: formatBooleanCell(isCollectionBookQualityComplete(progress, 'epic')),
    collectionLegendary: formatBooleanCell(isCollectionBookQualityComplete(progress, 'legendary')),
  }

  const rowValues = [
    ...MASTER_BLUEPRINT_COLUMNS.map((column) => baseValues[column.key] ?? ''),
    ...PROGRESS_COLUMNS.map((column) => progressValues[column.key] ?? ''),
  ]

  return rowValues
}

function getBlueprintItemType(item = {}) {
  return String(
    item?.classification?.type ||
    item?.structuredData?.meta?.type ||
    item?.structuredData?.meta?.category ||
    ''
  ).trim()
}

function getBlueprintItemTier(item = {}) {
  return getTierOrderIndex(item?.structuredData?.meta?.tier)
}

function getBlueprintItemSourceOrder(item = {}, fallbackIndex = 0) {
  if (typeof item?.sourceIndex === 'number') {
    return item.sourceIndex
  }

  if (typeof item?.rowIndex === 'number') {
    return item.rowIndex
  }

  return fallbackIndex
}

function sortBlueprintItemsForWorkbook(blueprintItems = []) {
  return blueprintItems
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftGroup = String(left.item?.classification?.group || left.item?.classification?.category || '').trim()
      const rightGroup = String(right.item?.classification?.group || right.item?.classification?.category || '').trim()
      const typeOrder = GROUP_TYPE_ORDER_INDEX.get(leftGroup) || GROUP_TYPE_ORDER_INDEX.get(rightGroup) || new Map()
      const leftType = getBlueprintItemType(left.item)
      const rightType = getBlueprintItemType(right.item)
      const leftTypeIndex = typeOrder.get(leftType.toLowerCase())
      const rightTypeIndex = typeOrder.get(rightType.toLowerCase())

      if (leftTypeIndex !== rightTypeIndex) {
        if (leftTypeIndex === undefined) {
          return 1
        }

        if (rightTypeIndex === undefined) {
          return -1
        }

        return leftTypeIndex - rightTypeIndex
      }

      const leftTierIndex = getBlueprintItemTier(left.item)
      const rightTierIndex = getBlueprintItemTier(right.item)
      if (leftTierIndex !== rightTierIndex) {
        return leftTierIndex - rightTierIndex
      }

      const leftSourceOrder = getBlueprintItemSourceOrder(left.item, left.index)
      const rightSourceOrder = getBlueprintItemSourceOrder(right.item, right.index)
      return leftSourceOrder - rightSourceOrder
    })
    .map((entry) => entry.item)
}

function buildBlueprintWorkbookRows(blueprintItems = [], blueprintProgressByName = {}) {
  const headers = getBlueprintHeaders()
  const rows = sortBlueprintItemsForWorkbook(blueprintItems)
    .map((item) => {
      const progress = blueprintProgressByName?.[item?.name] || {}
      return buildBlueprintRow(item, progress)
    })
    .filter((row) => Array.isArray(row) && row.some((cell) => cell !== '' && cell !== null && cell !== undefined))

  return buildWorkbookSheetRows(headers, rows)
}

function buildWorkbookPayload(options = {}) {
  const settingsRows = Array.isArray(options?.settingsRows) ? options.settingsRows : []
  const savedViewRows = Array.isArray(options?.savedViewRows) ? options.savedViewRows : []
  const blueprintItems = Array.isArray(options?.blueprintItems) ? options.blueprintItems : []
  const blueprintProgressByName = options?.blueprintProgressByName && typeof options.blueprintProgressByName === 'object'
    ? options.blueprintProgressByName
    : {}

  const payload = {}
  payload[README_SHEET_TITLE] = [[...README_ROWS[0]], ...README_ROWS.slice(1)]
  BLUEPRINT_GROUP_TITLES.forEach((groupTitle) => {
    payload[groupTitle] = buildBlueprintWorkbookRows(
      blueprintItems.filter((item) => (item?.classification?.group || item?.classification?.category) === groupTitle),
      blueprintProgressByName
    )
  })
  payload['Saved Views'] = buildWorkbookSheetRows(
    ['id', 'name', 'dependency', 'ownership', 'inventory', 'mastered', 'collectionBook'],
    savedViewRows
  )
  payload.Settings = buildWorkbookSheetRows(['key', 'value'], settingsRows)

  return payload
}

function getLegacyBlueprintProgressColumnIndexes(headers = []) {
  return {
    milestones: getHeaderIndex(headers, ['Milestones', 'Milestone', 'milestones']),
    starforge: getHeaderIndex(headers, ['Starforge', 'starforge']),
    ascension: getHeaderIndex(headers, ['Ascension', 'ascension']),
    transcendence: getHeaderIndex(headers, ['Transcendence', 'transcendence']),
    starforgeUnlocked: getHeaderIndex(headers, ['Starforge Unlocked', 'starforgeUnlocked']),
    category: getHeaderIndex(headers, ['Category', 'Item Category', 'category', 'item category']),
    type: getHeaderIndex(headers, ['Type', 'Item Type', 'type', 'item type']),
    improve: getHeaderIndex(headers, ['Improve', 'improve']),
  }
}

function shouldRunLegacyProgressMigration(headers = []) {
  const normalizedHeaders = normalizeHeaderSet(headers)
  const usesLegacyProgressColumns =
    normalizedHeaders.has('starforge unlocked') ||
    normalizedHeaders.has('ascension') ||
    normalizedHeaders.has('transcendence') ||
    normalizedHeaders.has('milestone')
  const usesNewProgressColumns =
    normalizedHeaders.has('improve') &&
    normalizedHeaders.has('milestones') &&
    normalizedHeaders.has('starforge')

  const usesMilestonesAndStarforgeWithoutImprove =
    normalizedHeaders.has('milestones') &&
    normalizedHeaders.has('starforge') &&
    !normalizedHeaders.has('improve')

  return (usesLegacyProgressColumns || usesMilestonesAndStarforgeWithoutImprove) && !usesNewProgressColumns
}

function buildLegacyProgressColumnValues(rows = [], columnIndex = -1) {
  if (!Array.isArray(rows) || columnIndex < 0) {
    return []
  }

  return rows.map((row = []) => [row[columnIndex] ?? ''])
}

function buildDeleteColumnRequests(sheetId, columnIndexes = []) {
  if (typeof sheetId !== 'number') {
    return []
  }

  return [...new Set(columnIndexes.filter((value) => Number.isInteger(value) && value >= 0))]
    .sort((left, right) => right - left)
    .map((columnIndex) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: columnIndex,
          endIndex: columnIndex + 1,
        },
      },
    }))
}

async function migrateLegacyBlueprintSheetRows(accessToken, spreadsheetId, sheetTitle, sheetId) {
  const response = await requestSheetsApi(
    `/${spreadsheetId}/values/${encodeURIComponent(toSheetRange(sheetTitle, 'A:ZZ'))}`,
    accessToken,
    { method: 'GET' }
  )

  const rows = normalizeSheetRows(response?.values || [])
  const headerRow = rows[0] || []
  const dataRows = rows.slice(1)

  if (!headerRow.length || !dataRows.length) {
    return false
  }

  const columnIndexes = getLegacyBlueprintProgressColumnIndexes(headerRow)
  const hasLegacyTypeHeader = columnIndexes.category >= 0 && columnIndexes.type < 0
  const hasLegacyProgressMigration = shouldRunLegacyProgressMigration(headerRow)

  if (!hasLegacyTypeHeader && !hasLegacyProgressMigration) {
    return false
  }

  const nextRows = rows.map((row) => [...row])
  const rowCount = nextRows.length
  const updateRequests = []
  let didPrepareLegacyProgressMigration = false
  let improveTargetIndex = columnIndexes.improve
  let didReuseAscensionColumnForImprove = false

  if (hasLegacyTypeHeader) {
    const typeHeaderColumn = columnIndexToLetter(columnIndexes.category + 1)
    updateRequests.push(() => requestSheetsApi(
      `/${spreadsheetId}/values/${encodeURIComponent(toSheetRange(sheetTitle, `${typeHeaderColumn}1`))}?valueInputOption=RAW`,
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify({
          range: toSheetRange(sheetTitle, `${typeHeaderColumn}1`),
          majorDimension: 'ROWS',
          values: [['Type']],
        }),
      }
    ))
  }

  // Keep Starforge numeric until Milestones and Improve math has finished.
  if (hasLegacyProgressMigration && columnIndexes.milestones >= 0 && columnIndexes.starforge >= 0) {
    didPrepareLegacyProgressMigration = true
    for (let rowIndex = 1; rowIndex < nextRows.length; rowIndex += 1) {
      const row = nextRows[rowIndex]
      const milestonesValue = getProgressCount(row[columnIndexes.milestones])
      const starforgeProgress = getProgressCount(row[columnIndexes.starforge])
      row[columnIndexes.milestones] = formatInventoryCell(Math.max(0, milestonesValue + starforgeProgress))
    }

    const milestonesColumn = columnIndexToLetter(columnIndexes.milestones + 1)

    updateRequests.push(() => requestSheetsApi(
      `/${spreadsheetId}/values/${encodeURIComponent(toSheetRange(sheetTitle, `${milestonesColumn}1:${milestonesColumn}${rowCount}`))}?valueInputOption=RAW`,
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify({
          range: toSheetRange(sheetTitle, `${milestonesColumn}1:${milestonesColumn}${rowCount}`),
          majorDimension: 'ROWS',
          values: buildLegacyProgressColumnValues(nextRows, columnIndexes.milestones),
        }),
      }
    ))
  }

  if (hasLegacyProgressMigration && columnIndexes.ascension >= 0 && columnIndexes.transcendence >= 0) {
    didPrepareLegacyProgressMigration = true

    if (improveTargetIndex < 0) {
      improveTargetIndex = columnIndexes.ascension
      didReuseAscensionColumnForImprove = true
      nextRows[0][improveTargetIndex] = 'Improve'
    }

    for (let rowIndex = 1; rowIndex < nextRows.length; rowIndex += 1) {
      const row = nextRows[rowIndex]
      const ascensionValue = getProgressCount(row[columnIndexes.ascension])
      const transcendenceValue = getProgressCount(row[columnIndexes.transcendence])
      row[improveTargetIndex] = formatInventoryCell(Math.max(0, ascensionValue + transcendenceValue))
    }

    if (didReuseAscensionColumnForImprove) {
      const improveHeaderColumn = columnIndexToLetter(improveTargetIndex + 1)
      updateRequests.push(() => requestSheetsApi(
        `/${spreadsheetId}/values/${encodeURIComponent(toSheetRange(sheetTitle, `${improveHeaderColumn}1`))}?valueInputOption=RAW`,
        accessToken,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: toSheetRange(sheetTitle, `${improveHeaderColumn}1`),
            majorDimension: 'ROWS',
            values: [['Improve']],
          }),
        }
      ))
    }

    const improveColumn = columnIndexToLetter(improveTargetIndex + 1)
    updateRequests.push(() => requestSheetsApi(
      `/${spreadsheetId}/values/${encodeURIComponent(toSheetRange(sheetTitle, `${improveColumn}1:${improveColumn}${rowCount}`))}?valueInputOption=RAW`,
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify({
          range: toSheetRange(sheetTitle, `${improveColumn}1:${improveColumn}${rowCount}`),
          majorDimension: 'ROWS',
          values: buildLegacyProgressColumnValues(nextRows, improveTargetIndex),
        }),
      }
    ))
  }

  if (hasLegacyProgressMigration && columnIndexes.starforge >= 0) {
    didPrepareLegacyProgressMigration = true
    for (let rowIndex = 1; rowIndex < nextRows.length; rowIndex += 1) {
      const row = nextRows[rowIndex]
      const starforgeProgress = getProgressCount(row[columnIndexes.starforge])
      row[columnIndexes.starforge] = formatBooleanCell(starforgeProgress > 0)
    }

    const starforgeColumn = columnIndexToLetter(columnIndexes.starforge + 1)
    updateRequests.push(() => requestSheetsApi(
      `/${spreadsheetId}/values/${encodeURIComponent(toSheetRange(sheetTitle, `${starforgeColumn}1:${starforgeColumn}${rowCount}`))}?valueInputOption=RAW`,
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify({
          range: toSheetRange(sheetTitle, `${starforgeColumn}1:${starforgeColumn}${rowCount}`),
          majorDimension: 'ROWS',
          values: buildLegacyProgressColumnValues(nextRows, columnIndexes.starforge),
        }),
      }
    ))
  }

  if (updateRequests.length) {
    for (const writeRequest of updateRequests) {
      await writeRequest()
    }
  }

  const deleteColumnIndexes = []

  if (didPrepareLegacyProgressMigration) {
    if (columnIndexes.ascension >= 0 && !didReuseAscensionColumnForImprove) {
      deleteColumnIndexes.push(columnIndexes.ascension)
    }
    if (columnIndexes.transcendence >= 0) {
      deleteColumnIndexes.push(columnIndexes.transcendence)
    }
    if (columnIndexes.starforgeUnlocked >= 0) {
      deleteColumnIndexes.push(columnIndexes.starforgeUnlocked)
    }
  }

  if (columnIndexes.category >= 0 && columnIndexes.type >= 0 && columnIndexes.category !== columnIndexes.type) {
    deleteColumnIndexes.push(columnIndexes.category)
  }

  const deleteRequests = buildDeleteColumnRequests(sheetId, deleteColumnIndexes)
  if (deleteRequests.length) {
    await requestSheetsApi(`/${spreadsheetId}:batchUpdate`, accessToken, {
      method: 'POST',
      body: JSON.stringify({ requests: deleteRequests }),
    })
  }

  return updateRequests.length > 0 || deleteRequests.length > 0
}

export async function migrateLegacyBlueprintSchemaInPlace(accessToken, spreadsheetId) {
  const spreadsheet = await requestSheetsApi(
    `/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
    accessToken
  )

  const sheets = Array.isArray(spreadsheet?.sheets) ? spreadsheet.sheets : []
  let didMigrateAnySheet = false

  for (const title of BLUEPRINT_GROUP_TITLES) {
    const sheet = sheets.find((candidate) => candidate?.properties?.title === title)
    const sheetId = sheet?.properties?.sheetId
    if (typeof sheetId !== 'number') {
      continue
    }

    const didMigrateSheet = await migrateLegacyBlueprintSheetRows(accessToken, spreadsheetId, title, sheetId)
    if (didMigrateSheet) {
      didMigrateAnySheet = true
    }
  }

  return didMigrateAnySheet
}

function ensureWorkbookOrder(sheetTitles) {
  return WORKBOOK_SHEET_TITLES.filter((title) => sheetTitles.includes(title))
}

async function requestJsonApi(baseUrl, path, accessToken, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    const error = new Error(errorText || 'Google API request failed.')
    error.status = response.status
    error.responseText = errorText
    throw error
  }

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return null
  }

  return response.json()
}

async function requestSheetsApi(path, accessToken, options = {}) {
  return requestJsonApi(SHEETS_API_BASE, path, accessToken, options)
}

async function requestDriveApi(path, accessToken, options = {}) {
  return requestJsonApi(DRIVE_API_BASE, path, accessToken, options)
}

function parseGoogleApiErrorPayload(error) {
  try {
    const message = error?.responseText || error?.message || ''
    if (!message) {
      return null
    }

    const parsed = JSON.parse(message)
    return parsed?.error || parsed || null
  } catch {
    return null
  }
}

function getGoogleApiErrorStatus(error) {
  if (typeof error?.status === 'number') {
    return error.status
  }

  const parsed = parseGoogleApiErrorPayload(error)
  if (typeof parsed?.code === 'number') {
    return parsed.code
  }
  if (typeof parsed?.status === 'number') {
    return parsed.status
  }

  const message = error?.message || ''
  if (/401|unauthorized/i.test(message)) {
    return 401
  }
  if (/403|forbidden/i.test(message)) {
    return 403
  }
  if (/429|rate limit|too many requests/i.test(message)) {
    return 429
  }
  if (/500|503|service unavailable|temporarily unavailable|timeout/i.test(message)) {
    return 503
  }
  if (/404|not found|requested entity was not found|NOT_FOUND/i.test(message)) {
    return 404
  }
  if (/410|gone/i.test(message)) {
    return 410
  }
  return null
}

function shouldRecoverSpreadsheet(error) {
  const status = getGoogleApiErrorStatus(error)
  return status === 404 || status === 410
}

export function isTokenExpiredError(error) {
  const status = getGoogleApiErrorStatus(error)
  return status === 401
}

export function shouldWipeSpreadsheetId(error) {
  const status = getGoogleApiErrorStatus(error)
  return status === 404 || status === 410
}

export function getGoogleSyncErrorMessage(error) {
  const payload = parseGoogleApiErrorPayload(error)
  const message = payload?.message || error?.message || ''
  const details = Array.isArray(payload?.details) ? payload.details : []
  const service = details.find((detail) => detail?.metadata?.service)?.metadata?.service || ''
  const isDriveApiDisabled = /drive\.googleapis\.com|Google Drive API|accessNotConfigured|SERVICE_DISABLED/i.test(`${message} ${service}`)

  if (isDriveApiDisabled) {
    return 'Google Drive API is not enabled for this app in the Google Cloud project. Please enable the Google Drive API, wait a minute or two, and try again.'
  }

  if (/401|unauthorized|invalid credentials/i.test(message)) {
    return 'Google sign-in has expired or your account permissions were rejected. Please sign in again and try syncing.'
  }

  if (/403|forbidden|permission denied/i.test(message)) {
    return 'Google denied access to create or update the sync sheet. Please make sure the app is allowed to access Google Sheets for your account.'
  }

  if (/429|rate limit|too many requests/i.test(message)) {
    return 'Google is rate-limiting requests right now. Please try again in a moment.'
  }

  if (/500|503|service unavailable|temporarily unavailable|timeout/i.test(message)) {
    return 'Google is temporarily unavailable. Please try again in a moment.'
  }

  return message || 'Unable to create or update the Google Sync Sheet.'
}

export function buildSpreadsheetCreationPromptMessage(reason = 'new-user') {
  if (reason === 'recovery') {
    return 'The previously saved Google Drive backup sheet could not be found. You can create a new backup sheet for backup and bulk editing, or enter the corrected sheet ID. Continue?'
  }

  return 'A Google Drive sync sheet could not be found. Would you like to create one for backup and bulk editing?'
}

export async function createUserSyncSpreadsheet(accessToken, title = 'Shopkeeper Companion User Data') {
  const createdSpreadsheet = await requestSheetsApi('', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: WORKBOOK_SHEET_TITLES.map((sheetTitle) => ({
        properties: { title: sheetTitle },
      })),
    }),
  })

  if (!createdSpreadsheet?.spreadsheetId) {
    throw new Error('Google Sheets did not return a spreadsheet ID.')
  }

  return createdSpreadsheet
}

async function moveSpreadsheetToFolder(accessToken, spreadsheetId, folderId) {
  const targetFolderId = String(folderId || '').trim()
  if (!targetFolderId) {
    return
  }

  const fileMetadata = await requestDriveApi(`/${spreadsheetId}?fields=id,parents`, accessToken)
  const parents = Array.isArray(fileMetadata?.parents) ? fileMetadata.parents : []
  const removeParents = parents.filter((parentId) => parentId !== targetFolderId).join(',')

  const query = new URLSearchParams()
  query.set('addParents', targetFolderId)
  if (removeParents) {
    query.set('removeParents', removeParents)
  }
  query.set('fields', 'id,parents')

  await requestDriveApi(`/${spreadsheetId}?${query.toString()}`, accessToken, {
    method: 'PATCH',
  })
}

export async function createUserSyncSpreadsheetInFolder(accessToken, folderId, title = 'Shopkeeper Companion User Data') {
  const createdSpreadsheet = await createUserSyncSpreadsheet(accessToken, title)
  await moveSpreadsheetToFolder(accessToken, createdSpreadsheet.spreadsheetId, folderId)
  return createdSpreadsheet
}

export function buildSpreadsheetUrl(spreadsheetId) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
}

export async function resolveUserSyncSpreadsheet(accessToken, preferredSpreadsheetId = '', options = {}) {
  const createSpreadsheet = async () => {
    const reason = options?.reason === 'recovery' ? 'recovery' : 'new-user'
    const message = buildSpreadsheetCreationPromptMessage(reason)
    const confirmCreate = options?.confirmCreate
    const promptForSpreadsheet = options?.promptForSpreadsheet

    if (typeof promptForSpreadsheet === 'function' && options?.reason === 'recovery') {
      const requestedLocation = await promptForSpreadsheet(message)
      if (typeof requestedLocation === 'string' && requestedLocation.trim()) {
        const fallbackId = requestedLocation.trim()
        try {
          const candidate = await requestSheetsApi(
            `/${fallbackId}?fields=spreadsheetId,spreadsheetUrl,sheets(properties(title))`,
            accessToken
          )

          if (candidate?.spreadsheetId) {
            return {
              spreadsheetId: candidate.spreadsheetId,
              spreadsheetUrl: candidate.spreadsheetUrl || buildSpreadsheetUrl(candidate.spreadsheetId),
            }
          }
        } catch (error) {
          if (!shouldRecoverSpreadsheet(error)) {
            throw error
          }
        }
      }
    }

    if (typeof confirmCreate === 'function') {
      const shouldCreate = await confirmCreate(message)
      if (!shouldCreate) {
        throw new Error('Google Sync Sheet creation was cancelled.')
      }
    }

    const targetFolderId = typeof options?.targetFolderId === 'string' ? options.targetFolderId.trim() : ''
    const createdSpreadsheet = targetFolderId
      ? await createUserSyncSpreadsheetInFolder(accessToken, targetFolderId, 'Shopkeeper Companion User Data')
      : await createUserSyncSpreadsheet(accessToken, 'Shopkeeper Companion User Data')
    return {
      spreadsheetId: createdSpreadsheet.spreadsheetId,
      spreadsheetUrl: createdSpreadsheet.spreadsheetUrl || buildSpreadsheetUrl(createdSpreadsheet.spreadsheetId),
      created: true,
    }
  }

  if (!preferredSpreadsheetId) {
    return createSpreadsheet()
  }

  try {
    const candidate = await requestSheetsApi(
      `/${preferredSpreadsheetId}?fields=spreadsheetId,spreadsheetUrl,sheets(properties(title))`,
      accessToken
    )

    if (candidate?.spreadsheetId) {
      return {
        spreadsheetId: candidate.spreadsheetId,
        spreadsheetUrl: candidate.spreadsheetUrl || buildSpreadsheetUrl(candidate.spreadsheetId),
        created: false,
      }
    }
  } catch (error) {
    if (!shouldRecoverSpreadsheet(error)) {
      throw error
    }
  }

  return createSpreadsheet()
}

export async function ensureUserSyncSpreadsheet(accessToken, preferredSpreadsheetId = '', options = {}) {
  let spreadsheet = await resolveUserSyncSpreadsheet(accessToken, preferredSpreadsheetId, options)

  try {
    const readmeSheetId = await ensureSheetsAndHeaders(accessToken, spreadsheet.spreadsheetId, {
      trimUnusedColumns: Boolean(spreadsheet?.created),
    })

    return {
      spreadsheetId: spreadsheet.spreadsheetId,
      spreadsheetUrl: spreadsheet.spreadsheetUrl || `${buildSpreadsheetUrl(spreadsheet.spreadsheetId)}#gid=${readmeSheetId}`,
      readmeSheetId,
    }
  } catch (error) {
    if (!shouldRecoverSpreadsheet(error)) {
      throw error
    }

    spreadsheet = await resolveUserSyncSpreadsheet(accessToken, '', options)
    const readmeSheetId = await ensureSheetsAndHeaders(accessToken, spreadsheet.spreadsheetId, {
      trimUnusedColumns: Boolean(spreadsheet?.created),
    })

    return {
      spreadsheetId: spreadsheet.spreadsheetId,
      spreadsheetUrl: spreadsheet.spreadsheetUrl || `${buildSpreadsheetUrl(spreadsheet.spreadsheetId)}#gid=${readmeSheetId}`,
      readmeSheetId,
    }
  }
}

function getWorkbookTargetColumnCounts() {
  const schemaEntries = getSyncWorkbookSchemaEntries()
  const countsByTitle = {
    [README_SHEET_TITLE]: 1,
  }

  schemaEntries.forEach((schema) => {
    if (!schema?.title || schema.title === README_SHEET_TITLE) {
      return
    }

    countsByTitle[schema.title] = Array.isArray(schema.headers) && schema.headers.length
      ? schema.headers.length
      : 1
  })

  return countsByTitle
}

async function trimWorkbookColumns(accessToken, spreadsheetId, sheets = []) {
  const targetColumnCounts = getWorkbookTargetColumnCounts()
  const requests = sheets
    .map((sheet) => {
      const title = sheet?.properties?.title
      const sheetId = sheet?.properties?.sheetId
      const currentColumnCount = sheet?.properties?.gridProperties?.columnCount
      const targetColumnCount = targetColumnCounts[title]

      if (typeof sheetId !== 'number' || typeof targetColumnCount !== 'number' || typeof currentColumnCount !== 'number') {
        return null
      }

      if (currentColumnCount <= targetColumnCount) {
        return null
      }

      return {
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: targetColumnCount,
            endIndex: currentColumnCount,
          },
        },
      }
    })
    .filter(Boolean)

  if (!requests.length) {
    return
  }

  await requestSheetsApi(`/${spreadsheetId}:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  })
}

export async function ensureSheetsAndHeaders(accessToken, spreadsheetId, options = {}) {
  const spreadsheet = await requestSheetsApi(
    `/${spreadsheetId}?fields=sheets(properties(sheetId,title,index,gridProperties(columnCount)))`,
    accessToken
  )
  const sheets = spreadsheet?.sheets || []
  const existingTitles = new Set(sheets.map((sheet) => sheet?.properties?.title).filter(Boolean))

  const missingTitles = WORKBOOK_SHEET_TITLES.filter((title) => !existingTitles.has(title))

  if (missingTitles.length) {
    await requestSheetsApi(`/${spreadsheetId}:batchUpdate`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        requests: missingTitles.map((title) => ({
          addSheet: {
            properties: {
              title,
            },
          },
        })),
      }),
    })
  }

  const refreshedSpreadsheet = await requestSheetsApi(
    `/${spreadsheetId}?fields=sheets(properties(sheetId,title,index,gridProperties(columnCount)))`,
    accessToken
  )
  const refreshedSheets = refreshedSpreadsheet?.sheets || []
  const readmeSheet = refreshedSheets.find((sheet) => sheet?.properties?.title === README_SHEET_TITLE)
  const readmeSheetId = readmeSheet?.properties?.sheetId

  if (typeof readmeSheetId !== 'number') {
    throw new Error('Unable to locate the ReadMe sheet.')
  }

  const desiredOrder = ensureWorkbookOrder(refreshedSheets.map((sheet) => sheet?.properties?.title).filter(Boolean))
  const orderUpdates = desiredOrder
    .map((title, index) => {
      const sheet = refreshedSheets.find((candidate) => candidate?.properties?.title === title)
      return sheet ? { sheetId: sheet.properties.sheetId, index } : null
    })
    .filter(Boolean)

  if (orderUpdates.length) {
    await requestSheetsApi(`/${spreadsheetId}:batchUpdate`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        requests: orderUpdates.map((entry) => ({
          updateSheetProperties: {
            properties: {
              sheetId: entry.sheetId,
              index: entry.index,
            },
            fields: 'index',
          },
        })),
      }),
    })
  }

  await requestSheetsApi(
    `/${spreadsheetId}/values/${encodeURIComponent(toSheetRange(README_SHEET_TITLE, 'A1:A200'))}?valueInputOption=RAW`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({
        range: toSheetRange(README_SHEET_TITLE, 'A1:A200'),
        majorDimension: 'ROWS',
        values: README_ROWS,
      }),
    }
  )

  await Promise.all(getSyncWorkbookSchemaEntries().map(async (schema) => {
    if (!schema.headers.length) {
      return
    }

    const currentHeader = await requestSheetsApi(
      `/${spreadsheetId}/values/${encodeURIComponent(toSheetRange(schema.title, '1:1'))}`,
      accessToken,
      { method: 'GET' }
    )

    const row = currentHeader?.values?.[0] || []
    const isMatch = schema.headers.every((header, index) => row[index] === header)

    if (!isMatch) {
      await requestSheetsApi(
        `/${spreadsheetId}/values/${encodeURIComponent(toSheetRange(schema.title, 'A1'))}?valueInputOption=RAW`,
        accessToken,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: toSheetRange(schema.title, 'A1'),
            majorDimension: 'ROWS',
            values: [schema.headers],
          }),
        }
      )
    }
  }))

  if (options?.trimUnusedColumns) {
    await trimWorkbookColumns(accessToken, spreadsheetId, refreshedSheets)
  }

  return readmeSheetId
}

export async function readSyncTables(accessToken, spreadsheetId) {
  const tables = {
    settings: [],
    savedViews: [],
    blueprintProgress: {},
    requiresBlueprintSchemaMigration: false,
    requiresBlueprintOrderNormalization: false,
  }

  for (const schema of getSyncWorkbookSchemaEntries()) {
    const response = await requestSheetsApi(
      `/${spreadsheetId}/values/${encodeURIComponent(toSheetRange(schema.title, 'A:ZZ'))}`,
      accessToken,
      { method: 'GET' }
    )

    const values = response?.values || []
    const rows = normalizeSheetRows(values)
    const dataRows = rows.length > 1 ? rows.slice(1) : []

    if (schema.title === README_SHEET_TITLE) {
      continue
    }

    if (schema.title === 'Saved Views') {
      tables.savedViews = dataRows
      continue
    }

    if (schema.title === 'Settings') {
      tables.settings = dataRows
      continue
    }

    if (BLUEPRINT_GROUP_TITLES.includes(schema.title)) {
      const headerRow = rows[0] || []
      const normalizedHeaders = normalizeHeaderSet(headerRow)
      const hasBlueprintRows = dataRows.length > 0
      const usesLegacyTypeHeader = normalizedHeaders.has('category') || normalizedHeaders.has('item category')
      const usesTypeHeader = normalizedHeaders.has('type') || normalizedHeaders.has('item type')
      const usesLegacyProgressColumns =
        normalizedHeaders.has('starforge unlocked') ||
        normalizedHeaders.has('ascension') ||
        normalizedHeaders.has('transcendence') ||
        normalizedHeaders.has('milestone')
      const usesNewProgressColumns =
        normalizedHeaders.has('improve') &&
        normalizedHeaders.has('milestones') &&
        normalizedHeaders.has('starforge')

      const usesMilestonesAndStarforgeWithoutImprove =
        normalizedHeaders.has('milestones') &&
        normalizedHeaders.has('starforge') &&
        !normalizedHeaders.has('improve')

      if (hasBlueprintRows && (usesLegacyProgressColumns || usesMilestonesAndStarforgeWithoutImprove) && !usesNewProgressColumns) {
        tables.requiresBlueprintSchemaMigration = true
      }

      if (hasBlueprintRows && usesLegacyTypeHeader && !usesTypeHeader) {
        tables.requiresBlueprintSchemaMigration = true
      }

      if (hasBlueprintRows && isBlueprintRowsOutOfOrder(headerRow, dataRows, schema.title)) {
        tables.requiresBlueprintOrderNormalization = true
      }

      tables.blueprintProgress[schema.title] = [rows[0] || [], ...dataRows]
    }
  }

  return tables
}

export async function writeSyncTables(accessToken, spreadsheetId, tablesByKey) {
  const workbookPayload = buildWorkbookPayload({
    settingsRows: Array.isArray(tablesByKey?.settings) ? tablesByKey.settings : [],
    savedViewRows: Array.isArray(tablesByKey?.savedViews) ? tablesByKey.savedViews : [],
    blueprintItems: Array.isArray(tablesByKey?.blueprintItems) ? tablesByKey.blueprintItems : [],
    blueprintProgressByName: tablesByKey?.blueprintProgressByName && typeof tablesByKey.blueprintProgressByName === 'object'
      ? tablesByKey.blueprintProgressByName
      : {},
  })

  const blueprintSchemaLastColumn = columnIndexToLetter(BLUEPRINT_SCHEMA_HEADERS.length)
  const ranges = WORKBOOK_SHEET_TITLES.map((title) => {
    if (BLUEPRINT_GROUP_TITLES.includes(title)) {
      return toSheetRange(title, `A:${blueprintSchemaLastColumn}`)
    }

    return toSheetRange(title, 'A:ZZ')
  })

  await requestSheetsApi(`/${spreadsheetId}/values:batchClear`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ ranges }),
  })

  const data = WORKBOOK_SHEET_TITLES.map((title) => ({
    range: toSheetRange(title, 'A1'),
    majorDimension: 'ROWS',
    values: workbookPayload[title] || [],
  }))

  await requestSheetsApi(`/${spreadsheetId}/values:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data,
    }),
  })
}

export {
  buildWorkbookPayload,
  getSyncWorkbookSchemaEntries,
}
