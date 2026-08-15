import { buildBlueprintProgressCsvRows, parseWorkbookBlueprintProgress } from './googleSheetSync.js'

export function toCsvField(value) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function buildCsvText(headers = [], rows = []) {
  return [headers, ...rows]
    .map((row) => row.map(toCsvField).join(','))
    .join('\r\n') + '\r\n'
}

export function parseCsvText(csvText = '') {
  const text = String(csvText).replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (inQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        inQuotes = false
      } else {
        field += character
      }
      continue
    }

    if (character === '"') {
      inQuotes = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') {
        index += 1
      }
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  if (inQuotes) {
    throw new Error('The CSV contains an unclosed quoted field.')
  }

  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((currentRow) => currentRow.some((value) => value !== ''))
}

export function exportBlueprintProgressCsvText(blueprintItems = [], blueprintProgressByName = {}) {
  const { headers, rows } = buildBlueprintProgressCsvRows(blueprintItems, blueprintProgressByName)
  return buildCsvText(headers, rows)
}

export function importBlueprintProgressCsvText(csvText, existingProgress = {}) {
  const rows = parseCsvText(csvText)
  const headers = rows[0] || []

  if (!headers.some((header) => String(header).trim().toLowerCase() === 'blueprint name')) {
    throw new Error('The CSV must include a Blueprint Name column.')
  }

  return {
    progress: parseWorkbookBlueprintProgress(rows, existingProgress),
    rowCount: Math.max(0, rows.length - 1),
  }
}