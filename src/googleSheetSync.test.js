import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSpreadsheetCreationPromptMessage,
  buildWorkbookPayload,
  getGoogleSyncErrorMessage,
  getSyncWorkbookSchemaEntries,
  parseWorkbookBlueprintProgress,
  resolveUserSyncSpreadsheet,
} from './googleSheetSync.js'

test('buildWorkbookPayload creates the requested sheet order and initializes blueprint progress defaults', () => {
  const payload = buildWorkbookPayload({
    settingsRows: [['theme', 'dark']],
    savedViewRows: [['view-1', 'My View', 'any', 'owned', 'has', 'any', '["superior"]']],
    blueprintItems: [
      {
        name: 'Test Sword',
        classification: { category: 'Weapons', type: 'Sword' },
        structuredData: { meta: { name: 'Test Sword', type: 'Sword', tier: 1 } },
      },
    ],
    blueprintProgressByName: {
      'Test Sword': {
        owned: true,
        inventory: { normal: 2 },
        collectionBookComplete: true,
      },
    },
  })

  const sheetTitles = Object.keys(payload)
  assert.deepEqual(sheetTitles, ['ReadMe', 'Weapons', 'Armor', 'Accessories', 'Enchantments', 'Saved Views', 'Settings'])

  assert.equal(getSyncWorkbookSchemaEntries()[0].title, 'ReadMe')
  assert.ok(Array.isArray(payload.Weapons))
  assert.equal(payload.Weapons[0][0], 'Blueprint Name')
  assert.equal(payload.Weapons[1][0], 'Test Sword')
  assert.equal(payload.Weapons[1][payload.Weapons[0].indexOf('Owned')], 'TRUE')
  assert.equal(payload.Weapons[1][payload.Weapons[0].indexOf('Inventory Normal')], '2')
  assert.equal(payload.Weapons[1][payload.Weapons[0].indexOf('Collection Legendary')], 'TRUE')
})

test('parseWorkbookBlueprintProgress merges workbook rows by blueprint name and preserves existing progress', () => {
  const progress = parseWorkbookBlueprintProgress({
    Weapons: [
      ['Blueprint Name', 'Owned', 'Inventory Normal', 'Collection Legendary'],
      ['Alpha', 'TRUE', '3', 'TRUE'],
      ['Beta', 'FALSE', '0', 'FALSE'],
    ],
  }, {
    Alpha: { owned: false, inventory: { normal: 1 }, collectionBookComplete: false },
  })

  assert.equal(progress.Alpha.owned, true)
  assert.equal(progress.Alpha.inventory.normal, 3)
  assert.equal(progress.Alpha.collectionBook.legendary, true)
  assert.equal(progress.Beta.owned, false)
})

test('parseWorkbookBlueprintProgress initializes progression stages as numeric values', () => {
  const progress = parseWorkbookBlueprintProgress({
    Weapons: [
      ['Blueprint Name', 'Milestones', 'Starforge', 'Ascension', 'Transcendence'],
      ['Alpha', '', '', '', ''],
    ],
  }, {})

  assert.equal(progress.Alpha.milestones, 0)
  assert.equal(progress.Alpha.starforge, 0)
  assert.equal(progress.Alpha.ascension, 0)
  assert.equal(progress.Alpha.transcendence, 0)
  assert.equal(typeof progress.Alpha.milestones, 'number')
})

test('buildSpreadsheetCreationPromptMessage explains the new-sheet workflow for new users and recovery', () => {
  assert.match(buildSpreadsheetCreationPromptMessage('new-user'), /Google Drive/i)
  assert.match(buildSpreadsheetCreationPromptMessage('recovery'), /backup sheet/i)
})

test('getGoogleSyncErrorMessage surfaces the Drive API configuration issue clearly', () => {
  const error = new Error(JSON.stringify({
    error: {
      code: 403,
      message: 'Google Drive API has not been used in project 123 before or it is disabled.',
      details: [{ metadata: { service: 'drive.googleapis.com' } }],
    },
  }))

  assert.match(getGoogleSyncErrorMessage(error), /Google Drive API is not enabled/i)
})

test('resolveUserSyncSpreadsheet ignores missing Sheets files and creates a fresh spreadsheet', async () => {
  const originalFetch = global.fetch
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push(url)

    if (String(url).includes('/deleted-id?fields=spreadsheetId,spreadsheetUrl,sheets(properties(title))')) {
      return {
        ok: false,
        status: 404,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({ error: { message: 'Requested entity was not found.', status: 'NOT_FOUND' } }),
      }
    }

    if (String(url).includes('https://sheets.googleapis.com/v4/spreadsheets') && options.method === 'POST') {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ spreadsheetId: 'fresh-id', spreadsheetUrl: 'https://example.com/fresh' }),
      }
    }

    throw new Error(`Unexpected fetch ${url}`)
  }

  try {
    const spreadsheet = await resolveUserSyncSpreadsheet('token', 'deleted-id')
    assert.equal(spreadsheet.spreadsheetId, 'fresh-id')
    assert.equal(calls.length, 2)
  } finally {
    global.fetch = originalFetch
  }
})
