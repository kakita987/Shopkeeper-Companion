const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
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
  { key: 'inventoryNormal', label: 'Inventory Normal' },
  { key: 'inventorySuperior', label: 'Inventory Superior' },
  { key: 'inventoryFlawless', label: 'Inventory Flawless' },
  { key: 'inventoryEpic', label: 'Inventory Epic' },
  { key: 'inventoryLegendary', label: 'Inventory Legendary' },
  { key: 'owned', label: 'Owned' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'ascension', label: 'Ascension' },
  { key: 'starforge', label: 'Starforge' },
  { key: 'transcendence', label: 'Transcendence' },
  { key: 'collectionSuperior', label: 'Collection Superior' },
  { key: 'collectionFlawless', label: 'Collection Flawless' },
  { key: 'collectionEpic', label: 'Collection Epic' },
  { key: 'collectionLegendary', label: 'Collection Legendary' },
]

const MASTER_BLUEPRINT_COLUMNS = [
  { key: 'blueprintName', label: 'Blueprint Name' },
  { key: 'category', label: 'Category' },
  { key: 'tier', label: 'Tier' },
]

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

      const milestoneFields = [
        ['Milestones', 'milestones'],
        ['Ascension', 'ascension'],
        ['Starforge', 'starforge'],
        ['Transcendence', 'transcendence'],
      ]

      milestoneFields.forEach(([label, key]) => {
        const rawValue = getRowValue(row, headerRow, [label])
        if (rawValue !== '') {
          currentProgress[key] = getProgressCount(rawValue)
        }
      })

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
    category: classification?.category || '',
    tier: structuredData?.meta?.tier ?? '',
  }

  const progressValues = {
    inventoryNormal: formatInventoryCell(progress?.inventory?.normal ?? 0),
    inventorySuperior: formatInventoryCell(progress?.inventory?.superior ?? 0),
    inventoryFlawless: formatInventoryCell(progress?.inventory?.flawless ?? 0),
    inventoryEpic: formatInventoryCell(progress?.inventory?.epic ?? 0),
    inventoryLegendary: formatInventoryCell(progress?.inventory?.legendary ?? 0),
    owned: formatBooleanCell(progress?.owned),
    milestones: formatInventoryCell(progress?.milestones ?? 0),
    ascension: formatInventoryCell(progress?.ascension ?? 0),
    starforge: formatInventoryCell(progress?.starforge ?? 0),
    transcendence: formatInventoryCell(progress?.transcendence ?? 0),
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
    throw new Error(errorText || 'Google API request failed.')
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

function isNotFoundError(error) {
  const message = error?.message || ''
  return error?.status === 404 || /not found|requested entity was not found|NOT_FOUND/i.test(message)
}

export async function createUserSyncSpreadsheet(accessToken, title = 'Shopkeeper Companion User Data') {
  const createdFile = await requestDriveApi('/files?fields=id,name,webViewLink', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name: title,
      mimeType: 'application/vnd.google-apps.spreadsheet',
    }),
  })

  if (!createdFile?.id) {
    throw new Error('Google Drive did not return a spreadsheet ID.')
  }

  return createdFile
}

export function buildSpreadsheetUrl(spreadsheetId) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
}

export async function resolveUserSyncSpreadsheet(accessToken, preferredSpreadsheetId = '') {
  const createSpreadsheet = async () => {
    const createdFile = await createUserSyncSpreadsheet(accessToken, 'Shopkeeper Companion User Data')
    return {
      spreadsheetId: createdFile.id,
      spreadsheetUrl: createdFile.webViewLink || buildSpreadsheetUrl(createdFile.id),
    }
  }

  if (!preferredSpreadsheetId) {
    return createSpreadsheet()
  }

  try {
    const driveFile = await requestDriveApi(
      `/files/${encodeURIComponent(preferredSpreadsheetId)}?fields=id,name,mimeType,trashed,webViewLink`,
      accessToken
    )

    if (driveFile?.trashed || driveFile?.mimeType !== 'application/vnd.google-apps.spreadsheet') {
      return createSpreadsheet()
    }

    const candidate = await requestSheetsApi(`/${preferredSpreadsheetId}?fields=spreadsheetId,sheets(properties(title))`, accessToken)
    if (candidate?.spreadsheetId) {
      return {
        spreadsheetId: candidate.spreadsheetId,
        spreadsheetUrl: driveFile.webViewLink || buildSpreadsheetUrl(candidate.spreadsheetId),
      }
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }
  }

  return createSpreadsheet()
}

export async function ensureUserSyncSpreadsheet(accessToken, preferredSpreadsheetId = '') {
  let spreadsheet = await resolveUserSyncSpreadsheet(accessToken, preferredSpreadsheetId)

  try {
    const readmeSheetId = await ensureSheetsAndHeaders(accessToken, spreadsheet.spreadsheetId)

    return {
      spreadsheetId: spreadsheet.spreadsheetId,
      spreadsheetUrl: spreadsheet.spreadsheetUrl || `${buildSpreadsheetUrl(spreadsheet.spreadsheetId)}#gid=${readmeSheetId}`,
      readmeSheetId,
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }

    spreadsheet = await resolveUserSyncSpreadsheet(accessToken, '')
    const readmeSheetId = await ensureSheetsAndHeaders(accessToken, spreadsheet.spreadsheetId)

    return {
      spreadsheetId: spreadsheet.spreadsheetId,
      spreadsheetUrl: spreadsheet.spreadsheetUrl || `${buildSpreadsheetUrl(spreadsheet.spreadsheetId)}#gid=${readmeSheetId}`,
      readmeSheetId,
    }
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
