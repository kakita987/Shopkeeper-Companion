const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const README_SHEET_TITLE = 'ReadMe'
const WORKBOOK_SHEET_TITLES = ['ReadMe', 'Weapons', 'Armor', 'Accessories', 'Enchantments', 'Saved Views', 'Settings']
const BLUEPRINT_CATEGORY_TITLES = ['Weapons', 'Armor', 'Accessories', 'Enchantments']

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
  ['3) Settings: theme/font preferences and other small app settings.'],
  [''],
  ['Tips'],
  ['- Bulk edit with copy/paste or formulas, then click Sync Now in the app.'],
  ['- Keep the header row names unchanged so sync can parse correctly.'],
]

const PROGRESS_COLUMNS = [
  { key: 'owned', label: 'Owned' },
  { key: 'inventoryNormal', label: 'Inventory Normal' },
  { key: 'inventorySuperior', label: 'Inventory Superior' },
  { key: 'inventoryFlawless', label: 'Inventory Flawless' },
  { key: 'inventoryEpic', label: 'Inventory Epic' },
  { key: 'inventoryLegendary', label: 'Inventory Legendary' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'ascension', label: 'Ascension' },
  { key: 'starforge', label: 'Starforge' },
  { key: 'transcendence', label: 'Transcendence' },
  { key: 'collectionBook', label: 'Collection Book' },
]

const MASTER_BLUEPRINT_COLUMNS = [
  { key: 'blueprintName', label: 'Blueprint Name' },
  { key: 'category', label: 'Category' },
  { key: 'type', label: 'Type' },
  { key: 'tier', label: 'Tier' },
  { key: 'unlockPrerequisite', label: 'Unlock Prerequisite' },
  { key: 'researchScrolls', label: 'Research Scrolls' },
  { key: 'antiqueTokens', label: 'Antique Tokens' },
  { key: 'availableAsAntiqueDate', label: 'Available as an Antique starting on (UTC)' },
  { key: 'value', label: 'Value' },
  { key: 'craftingTimeSeconds', label: 'Crafting Time (seconds)' },
  { key: 'valueCraftTimeRatio', label: 'Value / Crafting Time' },
  { key: 'merchantXp', label: 'Merchant XP' },
  { key: 'workerXp', label: 'Worker XP' },
  { key: 'fusionXp', label: 'Fusion XP' },
  { key: 'favor', label: 'Favor' },
  { key: 'airshipPower', label: 'Airship Power' },
  { key: 'discountEnergy', label: 'Discount Energy' },
  { key: 'surchargeEnergy', label: 'Surcharge Energy' },
  { key: 'suggestEnergy', label: 'Suggest Energy' },
  { key: 'speedUpEnergy', label: 'Speed Up Energy' },
  { key: 'atk', label: 'ATK' },
  { key: 'def', label: 'DEF' },
  { key: 'hp', label: 'HP' },
  { key: 'eva', label: 'EVA' },
  { key: 'crit', label: 'CRIT' },
  { key: 'elementalAffinity', label: 'Elemental Affinity' },
  { key: 'spiritAffinity', label: 'Spirit Affinity' },
  { key: 'builtInElement', label: 'Built-In Element' },
  { key: 'builtInSpirit', label: 'Built-In Spirit' },
]

const RESOURCE_LABELS = ['Iron', 'Wood', 'Steel', 'Leather', 'Herbs', 'Oils', 'Fabric', 'Gems', 'Mana', 'Essence']

const RESOURCE_COLUMNS = RESOURCE_LABELS.map((label, index) => ({
  key: `resource${index + 1}`,
  label,
}))

const UPGRADE_COLUMNS = Array.from({ length: 5 }, (_, index) => ({
  key: `upgrade${index + 1}`,
  label: `Upgrade ${index + 1}`,
}))

const UPGRADE_COUNT_COLUMNS = Array.from({ length: 5 }, (_, index) => ({
  key: `upgradeCount${index + 1}`,
  label: `Upgrade Count ${index + 1}`,
}))

const WORKER_COLUMNS = Array.from({ length: 3 }, (_, index) => ({
  key: `worker${index + 1}`,
  label: `Worker ${index + 1}`,
}))

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
    ...RESOURCE_COLUMNS.map((column) => column.label),
    ...UPGRADE_COLUMNS.map((column) => column.label),
    ...UPGRADE_COUNT_COLUMNS.map((column) => column.label),
    ...WORKER_COLUMNS.map((column) => column.label),
  ]
}

function toSheetRange(sheetTitle, range) {
  return `'${sheetTitle}'!${range}`
}

function toInventoryCount(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  return parsed
}

function cleanText(value) {
  if (value === null || value === undefined) {
    return ''
  }

  const text = String(value).trim()
  if (!text || text === '---') {
    return ''
  }

  return text
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

function hasCollectionBookProgress(progress = {}) {
  if (progress?.collectionBookComplete) {
    return true
  }

  return Boolean(progress?.collectionBook && Object.values(progress.collectionBook).some(Boolean))
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
    milestones: false,
    ascension: false,
    starforge: false,
    transcendence: false,
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

      const ownedValue = getRowValue(row, headerRow, ['Owned', 'owned'])
      if (ownedValue !== '') {
        currentProgress.owned = parseBooleanCell(ownedValue)
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
        if (rawValue === '') {
          nextInventory[key] = toInventoryCount(nextInventory[key])
          return
        }
        nextInventory[key] = toInventoryCount(rawValue)
      })

      currentProgress.inventory = nextInventory

      const milestoneFields = [
        ['Milestones', 'milestones'],
        ['Ascension', 'ascension'],
        ['Starforge', 'starforge'],
        ['Transcendence', 'transcendence'],
        ['Collection Book', 'collectionBookComplete'],
      ]

      milestoneFields.forEach(([label, key]) => {
        const rawValue = getRowValue(row, headerRow, [label])
        if (rawValue !== '') {
          currentProgress[key] = parseBooleanCell(rawValue)
        }
      })

      if (currentProgress.collectionBookComplete) {
        currentProgress.collectionBook = {
          superior: true,
          flawless: true,
          epic: true,
          legendary: true,
        }
      } else if (!currentProgress.collectionBook || Object.keys(currentProgress.collectionBook).length === 0) {
        currentProgress.collectionBook = {}
      }

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
  const materials = structuredData?.materials || {}
  const resources = materials?.resources || {}
  const components = Array.isArray(materials?.components) ? materials.components : []
  const upgrades = structuredData?.upgrades || {}
  const workers = Array.isArray(structuredData?.workers) ? structuredData.workers : []
  const stats = structuredData?.stats || {}

  const baseValues = {
    blueprintName: item?.name || '',
    category: classification?.category || '',
    type: classification?.type || '',
    tier: structuredData?.meta?.tier ?? '',
    unlockPrerequisite: structuredData?.meta?.unlockPrerequisite || '',
    researchScrolls: structuredData?.meta?.researchScrolls ?? '',
    antiqueTokens: structuredData?.meta?.antiqueTokens ?? '',
    availableAsAntiqueDate: structuredData?.meta?.availableAsAntiqueDate || '',
    value: structuredData?.economy?.value ?? '',
    craftingTimeSeconds: structuredData?.economy?.craftingTimeSeconds ?? '',
    valueCraftTimeRatio: structuredData?.economy?.valueCraftTimeRatio ?? '',
    merchantXp: structuredData?.economy?.merchantXp ?? '',
    workerXp: structuredData?.economy?.workerXp ?? '',
    fusionXp: structuredData?.economy?.fusionXp ?? '',
    favor: structuredData?.economy?.favor ?? '',
    airshipPower: structuredData?.economy?.airshipPower ?? '',
    discountEnergy: structuredData?.economy?.energy?.discount ?? '',
    surchargeEnergy: structuredData?.economy?.energy?.surcharge ?? '',
    suggestEnergy: structuredData?.economy?.energy?.suggest ?? '',
    speedUpEnergy: structuredData?.economy?.energy?.speedUp ?? '',
    atk: stats?.atk ?? '',
    def: stats?.def ?? '',
    hp: stats?.hp ?? '',
    eva: stats?.eva ?? '',
    crit: stats?.crit ?? '',
    elementalAffinity: stats?.elementalAffinity ?? '',
    spiritAffinity: stats?.spiritAffinity ?? '',
    builtInElement: stats?.builtInElement ?? '',
    builtInSpirit: stats?.builtInSpirit ?? '',
  }

  const resourceValues = RESOURCE_COLUMNS.map((column) => resources[column.label] ?? '')
  const upgradeValues = [
    ...(Array.isArray(upgrades?.crafting) ? upgrades.crafting : []),
    ...(Array.isArray(upgrades?.starforged) ? upgrades.starforged : []),
  ]

  const upgradeRowValues = UPGRADE_COLUMNS.map((_, index) => {
    const entry = Array.isArray(upgrades?.crafting) ? upgrades.crafting[index] : null
    return entry?.name || ''
  })
  const upgradeCountRowValues = UPGRADE_COUNT_COLUMNS.map((_, index) => {
    const entry = Array.isArray(upgrades?.crafting) ? upgrades.crafting[index] : null
    return entry?.count ?? ''
  })

  const workerRowValues = WORKER_COLUMNS.map((_, index) => {
    const worker = workers[index]
    return worker?.name ? `${worker.name}${worker.level ? ` (${worker.level})` : ''}` : ''
  })

  const progressValues = {
    owned: formatBooleanCell(progress?.owned),
    inventoryNormal: formatInventoryCell(progress?.inventory?.normal),
    inventorySuperior: formatInventoryCell(progress?.inventory?.superior),
    inventoryFlawless: formatInventoryCell(progress?.inventory?.flawless),
    inventoryEpic: formatInventoryCell(progress?.inventory?.epic),
    inventoryLegendary: formatInventoryCell(progress?.inventory?.legendary),
    milestones: formatBooleanCell(progress?.milestones),
    ascension: formatBooleanCell(progress?.ascension),
    starforge: formatBooleanCell(progress?.starforge),
    transcendence: formatBooleanCell(progress?.transcendence),
    collectionBook: formatBooleanCell(hasCollectionBookProgress(progress)),
  }

  const rowValues = [
    ...MASTER_BLUEPRINT_COLUMNS.map((column) => baseValues[column.key] ?? ''),
    ...PROGRESS_COLUMNS.map((column) => progressValues[column.key] ?? ''),
    ...resourceValues,
    ...upgradeRowValues,
    ...upgradeCountRowValues,
    ...workerRowValues,
  ]

  return rowValues
}

function buildBlueprintWorkbookRows(blueprintItems = [], blueprintProgressByName = {}) {
  const headers = getBlueprintHeaders()
  const rows = blueprintItems
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
  const trackedUpgradeRows = Array.isArray(options?.trackedUpgradeRows) ? options.trackedUpgradeRows : []
  const blueprintItems = Array.isArray(options?.blueprintItems) ? options.blueprintItems : []
  const blueprintProgressByName = options?.blueprintProgressByName && typeof options.blueprintProgressByName === 'object'
    ? options.blueprintProgressByName
    : {}

  const payload = {}
  payload[README_SHEET_TITLE] = [[...README_ROWS[0]], ...README_ROWS.slice(1)]
  payload.Weapons = buildBlueprintWorkbookRows(
    blueprintItems.filter((item) => item?.classification?.category === 'Weapons'),
    blueprintProgressByName
  )
  payload.Armor = buildBlueprintWorkbookRows(
    blueprintItems.filter((item) => item?.classification?.category === 'Armor'),
    blueprintProgressByName
  )
  payload.Accessories = buildBlueprintWorkbookRows(
    blueprintItems.filter((item) => item?.classification?.category === 'Accessories'),
    blueprintProgressByName
  )
  payload.Enchantments = buildBlueprintWorkbookRows(
    blueprintItems.filter((item) => item?.classification?.category === 'Enchantments'),
    blueprintProgressByName
  )
  payload['Saved Views'] = buildWorkbookSheetRows(
    ['id', 'name', 'dependency', 'ownership', 'inventory', 'mastered', 'collectionBook'],
    savedViewRows
  )
  payload.Settings = buildWorkbookSheetRows(['key', 'value'], settingsRows)

  return payload
}

function ensureWorkbookOrder(sheetTitles) {
  return WORKBOOK_SHEET_TITLES.filter((title) => sheetTitles.includes(title))
}

async function requestSheetsApi(path, accessToken, options = {}) {
  const response = await fetch(`${SHEETS_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Google Sheets request failed (${response.status}).`)
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

export function buildSpreadsheetUrl(spreadsheetId) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
}

export async function ensureUserSyncSpreadsheet(accessToken, preferredSpreadsheetId = '') {
  let spreadsheet = null

  if (preferredSpreadsheetId) {
    try {
      spreadsheet = await requestSheetsApi(`/${preferredSpreadsheetId}?fields=spreadsheetId,sheets(properties(title))`, accessToken)
    } catch (error) {
      spreadsheet = null
    }
  }

  if (!spreadsheet?.spreadsheetId) {
    spreadsheet = await requestSheetsApi('', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          title: 'Shopkeeper Companion User Data',
        },
        sheets: WORKBOOK_SHEET_TITLES.map((title) => ({
          properties: { title },
        })),
      }),
    })
  }

  const readmeSheetId = await ensureSheetsAndHeaders(accessToken, spreadsheet.spreadsheetId)

  return {
    spreadsheetId: spreadsheet.spreadsheetId,
    spreadsheetUrl: `${buildSpreadsheetUrl(spreadsheet.spreadsheetId)}#gid=${readmeSheetId}`,
    readmeSheetId,
  }
}

export async function ensureSheetsAndHeaders(accessToken, spreadsheetId) {
  const spreadsheet = await requestSheetsApi(
    `/${spreadsheetId}?fields=sheets(properties(sheetId,title,index))`,
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
    `/${spreadsheetId}?fields=sheets(properties(sheetId,title,index))`,
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

  return readmeSheetId
}

export async function readSyncTables(accessToken, spreadsheetId) {
  const tables = {
    settings: [],
    savedViews: [],
    blueprintProgress: {},
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

    if (BLUEPRINT_CATEGORY_TITLES.includes(schema.title)) {
      tables.blueprintProgress[schema.title] = [rows[0] || [], ...dataRows]
    }
  }

  return tables
}

export async function writeSyncTables(accessToken, spreadsheetId, tablesByKey) {
  const workbookPayload = buildWorkbookPayload({
    settingsRows: Array.isArray(tablesByKey?.settings) ? tablesByKey.settings : [],
    savedViewRows: Array.isArray(tablesByKey?.savedViews) ? tablesByKey.savedViews : [],
    trackedUpgradeRows: Array.isArray(tablesByKey?.trackedUpgrades) ? tablesByKey.trackedUpgrades : [],
    blueprintItems: Array.isArray(tablesByKey?.blueprintItems) ? tablesByKey.blueprintItems : [],
    blueprintProgressByName: tablesByKey?.blueprintProgressByName && typeof tablesByKey.blueprintProgressByName === 'object'
      ? tablesByKey.blueprintProgressByName
      : {},
  })

  const ranges = WORKBOOK_SHEET_TITLES.map((title) => toSheetRange(title, 'A:ZZ'))

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
  parseBooleanCell,
}
