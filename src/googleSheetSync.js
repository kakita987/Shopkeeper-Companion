const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const README_SHEET_TITLE = 'ReadMe'

const README_ROWS = [
  ['Shopkeeper Companion - User Data Sheet'],
  [''],
  ['How sync works'],
  ['- This sheet is bi-directional: app changes sync here, and your edits here sync back into the app.'],
  ['- Use TRUE/FALSE for checkbox-style fields (owned, collection flags).'],
  ['- Numeric fields accept whole numbers (inventory counts).'],
  [''],
  ['Tabs'],
  ['1) Settings: key/value preferences (theme, font).'],
  ['2) SavedViews: your filter presets used in the Saved Views page, including collection-book and mastered filters.'],
  ['3) TrackedUpgrades: one upgradeKey per tracked upgrade.'],
  ['4) BlueprintProgress: per-blueprint user-owned data, including quality inventory and collection book checks.'],
  [''],
  ['BlueprintProgress columns'],
  ['- blueprintName: must match the in-app blueprint name.'],
  ['- owned/master: TRUE or FALSE.'],
  ['- inventoryNormal/inventorySuperior/inventoryFlawless/inventoryEpic/inventoryLegendary: non-negative integers.'],
  ['- collectionSuperior/collectionFlawless/collectionEpic/collectionLegendary: TRUE or FALSE.'],
  [''],
  ['Tips'],
  ['- Bulk edit with copy/paste or formulas, then click Sync Now in the app.'],
  ['- Keep header row names unchanged on data tabs so sync can parse correctly.'],
]

export const SYNC_SCHEMA = {
  settings: {
    title: 'Settings',
    headers: ['key', 'value'],
  },
  savedViews: {
    title: 'SavedViews',
    headers: ['id', 'name', 'dependency', 'ownership', 'inventory', 'mastered', 'collectionBook'],
  },
  trackedUpgrades: {
    title: 'TrackedUpgrades',
    headers: ['upgradeKey'],
  },
  blueprintProgress: {
    title: 'BlueprintProgress',
    headers: [
      'blueprintName',
      'owned',
      'master',
      'inventoryNormal',
      'inventorySuperior',
      'inventoryFlawless',
      'inventoryEpic',
      'inventoryLegendary',
      'collectionSuperior',
      'collectionFlawless',
      'collectionEpic',
      'collectionLegendary',
    ],
  },
}

function getSchemaEntries() {
  return Object.entries(SYNC_SCHEMA)
}

function toSheetRange(sheetTitle, range) {
  return `'${sheetTitle}'!${range}`
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
        sheets: [
          {
            properties: {
              title: README_SHEET_TITLE,
            },
          },
          ...getSchemaEntries().map(([, schema]) => ({
            properties: {
              title: schema.title,
            },
          })),
        ],
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

  const missingTitles = [README_SHEET_TITLE, ...getSchemaEntries().map(([, schema]) => schema.title)]
    .filter((title) => !existingTitles.has(title))

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

  if ((readmeSheet?.properties?.index ?? 0) !== 0) {
    await requestSheetsApi(`/${spreadsheetId}:batchUpdate`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: readmeSheetId,
                index: 0,
              },
              fields: 'index',
            },
          },
        ],
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

  await Promise.all(getSchemaEntries().map(async ([, schema]) => {
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
  const entries = await Promise.all(getSchemaEntries().map(async ([key, schema]) => {
    const response = await requestSheetsApi(
      `/${spreadsheetId}/values/${encodeURIComponent(toSheetRange(schema.title, 'A:ZZ'))}`,
      accessToken,
      { method: 'GET' }
    )

    const values = response?.values || []
    const rows = values.length > 1 ? values.slice(1) : []

    return [key, rows]
  }))

  return Object.fromEntries(entries)
}

export async function writeSyncTables(accessToken, spreadsheetId, tablesByKey) {
  const ranges = getSchemaEntries().map(([, schema]) => toSheetRange(schema.title, 'A:ZZ'))

  await requestSheetsApi(`/${spreadsheetId}/values:batchClear`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      ranges,
    }),
  })

  const data = getSchemaEntries().map(([key, schema]) => {
    const rows = Array.isArray(tablesByKey?.[key]) ? tablesByKey[key] : []

    return {
      range: toSheetRange(schema.title, 'A1'),
      majorDimension: 'ROWS',
      values: [schema.headers, ...rows],
    }
  })

  await requestSheetsApi(`/${spreadsheetId}/values:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data,
    }),
  })
}
