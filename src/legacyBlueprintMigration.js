const BLUEPRINT_GROUP_TITLES = ['Weapons', 'Armor', 'Accessories', 'Enchantments']

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

function normalizeSheetRows(values = []) {
  const rows = Array.isArray(values) ? values : []
  return rows.filter((row) => Array.isArray(row) && row.some((cell) => cell !== '' && cell !== null && cell !== undefined))
}

function getHeaderIndex(headers = [], labels = []) {
  const normalizedLabels = labels.map((label) => String(label || '').trim().toLowerCase())
  return headers.findIndex((header) => normalizedLabels.includes(String(header || '').trim().toLowerCase()))
}

function normalizeHeaderSet(headers = []) {
  return new Set(
    (Array.isArray(headers) ? headers : [])
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean)
  )
}

function getProgressCount(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function formatInventoryCell(value) {
  return String(Math.max(0, Number(value) || 0))
}

function formatBooleanCell(value) {
  return Boolean(value) ? 'TRUE' : 'FALSE'
}

function toSheetRange(sheetTitle, range) {
  return `'${sheetTitle}'!${range}`
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
  return requestJsonApi('https://sheets.googleapis.com/v4/spreadsheets', path, accessToken, options)
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
