import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSpreadsheetCreationPromptMessage,
  buildWorkbookPayload,
  getGoogleSyncErrorMessage,
  getSyncWorkbookSchemaEntries,
  isTokenExpiredError,
  migrateLegacyBlueprintSchemaInPlace,
  parseWorkbookBlueprintProgress,
  readSyncTables,
  resolveUserSyncSpreadsheet,
  shouldWipeSpreadsheetId,
  writeSyncTables,
} from './googleSheetSync.js'

test('buildWorkbookPayload creates the requested sheet order and initializes blueprint progress defaults', () => {
  const payload = buildWorkbookPayload({
    settingsRows: [['theme', 'dark']],
    savedViewRows: [['view-1', 'My View', 'any', 'owned', 'has', 'any', '["superior"]']],
    blueprintItems: [
      {
        name: 'Test Sword',
        classification: { group: 'Weapons', type: 'Sword' },
        structuredData: { meta: { name: 'Test Sword', type: 'Sword', tier: 1 } },
      },
    ],
    blueprintProgressByName: {
      'Test Sword': {
        owned: true,
        starforgeUnlocked: true,
        milestones: 5,
        starforge: 2,
        ascension: 3,
        transcendence: 1,
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
  assert.equal(payload.Weapons[0][1], 'Type')
  assert.equal(payload.Weapons[1][0], 'Test Sword')
  assert.equal(payload.Weapons[1][1], 'Sword')
  assert.equal(payload.Weapons[1][payload.Weapons[0].indexOf('Owned')], 'TRUE')
  assert.equal(payload.Weapons[1][payload.Weapons[0].indexOf('Starforge')], 'TRUE')
  assert.equal(payload.Weapons[1][payload.Weapons[0].indexOf('Milestones')], '7')
  assert.equal(payload.Weapons[1][payload.Weapons[0].indexOf('Improve')], '4')
  assert.equal(payload.Weapons[1][payload.Weapons[0].indexOf('Inventory Normal')], '2')
  assert.equal(payload.Weapons[1][payload.Weapons[0].indexOf('Collection Legendary')], 'TRUE')
})

test('buildWorkbookPayload includes imported blueprints even without any saved progress', () => {
  const payload = buildWorkbookPayload({
    settingsRows: [],
    savedViewRows: [],
    blueprintItems: [
      {
        name: 'Starter Sword',
        classification: { group: 'Weapons', type: 'Sword' },
        structuredData: { meta: { name: 'Starter Sword', type: 'Sword', tier: 1 } },
      },
      {
        name: 'Wooden Shield',
        classification: { group: 'Armor', type: 'Shield' },
        structuredData: { meta: { name: 'Wooden Shield', type: 'Shield', tier: 1 } },
      },
    ],
    blueprintProgressByName: {},
  })

  assert.equal(payload.Weapons.length, 2)
  assert.equal(payload.Weapons[1][0], 'Starter Sword')
  assert.equal(payload.Armor.length, 2)
  assert.equal(payload.Armor[1][0], 'Wooden Shield')
})

test('buildWorkbookPayload follows configured weapon order for Wand and Staff', () => {
  const payload = buildWorkbookPayload({
    settingsRows: [],
    savedViewRows: [],
    blueprintItems: [
      {
        name: 'Wizard Wand',
        classification: { group: 'Weapons', type: 'Wand' },
        structuredData: { meta: { name: 'Wizard Wand', type: 'Wand', tier: 1 } },
      },
      {
        name: 'Oak Staff',
        classification: { group: 'Weapons', type: 'Staff' },
        structuredData: { meta: { name: 'Oak Staff', type: 'Staff', tier: 1 } },
      },
    ],
    blueprintProgressByName: {},
  })

  assert.equal(payload.Weapons[1][0], 'Wizard Wand')
  assert.equal(payload.Weapons[2][0], 'Oak Staff')
})

test('buildWorkbookPayload follows configured accessories order for Quiver', () => {
  const payload = buildWorkbookPayload({
    settingsRows: [],
    savedViewRows: [],
    blueprintItems: [
      {
        name: 'Archer Idol',
        classification: { group: 'Accessories', type: 'Idol' },
        structuredData: { meta: { name: 'Archer Idol', type: 'Idol', tier: 1 } },
      },
      {
        name: 'Feather Quiver',
        classification: { group: 'Accessories', type: 'Quiver' },
        structuredData: { meta: { name: 'Feather Quiver', type: 'Quiver', tier: 1 } },
      },
      {
        name: 'Songbook Aurasong',
        classification: { group: 'Accessories', type: 'Aurasong' },
        structuredData: { meta: { name: 'Songbook Aurasong', type: 'Aurasong', tier: 1 } },
      },
    ],
    blueprintProgressByName: {},
  })

  assert.equal(payload.Accessories[1][0], 'Songbook Aurasong')
  assert.equal(payload.Accessories[2][0], 'Feather Quiver')
  assert.equal(payload.Accessories[3][0], 'Archer Idol')
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

test('parseWorkbookBlueprintProgress reads legacy progression stages as numeric values', () => {
  const progress = parseWorkbookBlueprintProgress({
    Weapons: [
      ['Blueprint Name', 'Starforge Unlocked', 'Milestones', 'Starforge', 'Ascension', 'Transcendence'],
      ['Alpha', 'TRUE', '', '', '', ''],
    ],
  }, {})

  assert.equal(progress.Alpha.starforgeUnlocked, true)
  assert.equal(progress.Alpha.milestones, 0)
  assert.equal(progress.Alpha.starforge, 0)
  assert.equal(progress.Alpha.ascension, 0)
  assert.equal(progress.Alpha.transcendence, 0)
  assert.equal(typeof progress.Alpha.milestones, 'number')
})

test('parseWorkbookBlueprintProgress supports singular legacy Milestone header', () => {
  const progress = parseWorkbookBlueprintProgress({
    Weapons: [
      ['Blueprint Name', 'Milestone', 'Starforge'],
      ['Alpha', '4', '2'],
    ],
  }, {})

  assert.equal(progress.Alpha.milestones, 4)
  assert.equal(progress.Alpha.starforge, 2)
})

test('parseWorkbookBlueprintProgress converts new schema into internal milestone/improve segments', () => {
  const progress = parseWorkbookBlueprintProgress({
    Weapons: [
      ['Blueprint Name', 'Milestones', 'Improve', 'Starforge'],
      ['Alpha', '7', '5', 'TRUE'],
    ],
  }, {})

  assert.equal(progress.Alpha.milestones, 5)
  assert.equal(progress.Alpha.starforge, 2)
  assert.equal(progress.Alpha.starforgeUnlocked, true)
  assert.equal(progress.Alpha.ascension, 3)
  assert.equal(progress.Alpha.transcendence, 2)
})

test('parseWorkbookBlueprintProgress infers starforge unlock from legacy starforge progress', () => {
  const progress = parseWorkbookBlueprintProgress({
    Weapons: [
      ['Blueprint Name', 'Starforge'],
      ['Alpha', '2'],
    ],
  }, {})

  assert.equal(progress.Alpha.starforgeUnlocked, true)
  assert.equal(progress.Alpha.starforge, 2)
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

test('isTokenExpiredError returns true only for auth-expired responses', () => {
  const tokenError = new Error('Request had invalid authentication credentials')
  tokenError.status = 401

  const forbiddenError = new Error('permission denied')
  forbiddenError.status = 403

  assert.equal(isTokenExpiredError(tokenError), true)
  assert.equal(isTokenExpiredError(forbiddenError), false)
})

test('shouldWipeSpreadsheetId only returns true for missing spreadsheet responses', () => {
  const missingError = new Error('not found')
  missingError.status = 404

  const goneError = new Error('gone')
  goneError.status = 410

  const tokenError = new Error('unauthorized')
  tokenError.status = 401

  assert.equal(shouldWipeSpreadsheetId(missingError), true)
  assert.equal(shouldWipeSpreadsheetId(goneError), true)
  assert.equal(shouldWipeSpreadsheetId(tokenError), false)
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

test('readSyncTables flags migration when legacy Category header is present', async () => {
  const originalFetch = global.fetch

  global.fetch = async (url) => {
    const decodedUrl = decodeURIComponent(String(url))
    const contentTypeHeaders = { get: () => 'application/json' }

    if (decodedUrl.includes("'Weapons'!A:ZZ")) {
      return {
        ok: true,
        status: 200,
        headers: contentTypeHeaders,
        json: async () => ({
          values: [
            ['Blueprint Name', 'Category', 'Tier', 'Owned', 'Milestones', 'Improve', 'Starforge'],
            ['Alpha Sword', 'Sword', '1', 'TRUE', '3', '2', 'TRUE'],
          ],
        }),
      }
    }

    return {
      ok: true,
      status: 200,
      headers: contentTypeHeaders,
      json: async () => ({ values: [] }),
    }
  }

  try {
    const tables = await readSyncTables('token', 'spreadsheet-id')
    assert.equal(tables.requiresBlueprintSchemaMigration, true)
  } finally {
    global.fetch = originalFetch
  }
})

test('readSyncTables flags order normalization when blueprint rows are out of configured order', async () => {
  const originalFetch = global.fetch

  global.fetch = async (url) => {
    const decodedUrl = decodeURIComponent(String(url))
    const contentTypeHeaders = { get: () => 'application/json' }

    if (decodedUrl.includes("'Weapons'!A:ZZ")) {
      return {
        ok: true,
        status: 200,
        headers: contentTypeHeaders,
        json: async () => ({
          values: [
            ['Blueprint Name', 'Type', 'Tier', 'Owned', 'Starforge', 'Milestones', 'Improve'],
            ['Wizard Wand', 'Wand', '1', 'TRUE', 'FALSE', '0', '0'],
            ['Hunting Bow', 'Bow', '1', 'TRUE', 'FALSE', '0', '0'],
          ],
        }),
      }
    }

    return {
      ok: true,
      status: 200,
      headers: contentTypeHeaders,
      json: async () => ({ values: [] }),
    }
  }

  try {
    const tables = await readSyncTables('token', 'spreadsheet-id')
    assert.equal(tables.requiresBlueprintSchemaMigration, false)
    assert.equal(tables.requiresBlueprintOrderNormalization, true)
  } finally {
    global.fetch = originalFetch
  }
})

test('writeSyncTables only clears schema columns on blueprint sheets', async () => {
  const originalFetch = global.fetch
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })

    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    }
  }

  try {
    await writeSyncTables('token', 'spreadsheet-id', {
      settings: [],
      savedViews: [],
      blueprintItems: [],
      blueprintProgressByName: {},
    })

    const clearCall = calls.find((call) => call.url.includes('/values:batchClear'))
    assert.ok(clearCall)
    const body = JSON.parse(clearCall.options.body)
    const ranges = Array.isArray(body?.ranges) ? body.ranges : []

    assert.ok(ranges.includes("'Weapons'!A:P"))
    assert.ok(ranges.includes("'Armor'!A:P"))
    assert.ok(ranges.includes("'Accessories'!A:P"))
    assert.ok(ranges.includes("'Enchantments'!A:P"))
    assert.ok(ranges.includes("'Saved Views'!A:ZZ"))
    assert.ok(ranges.includes("'Settings'!A:ZZ"))
    assert.ok(ranges.includes("'ReadMe'!A:ZZ"))
  } finally {
    global.fetch = originalFetch
  }
})

test('migrateLegacyBlueprintSchemaInPlace writes converted values before deleting legacy columns', async () => {
  const originalFetch = global.fetch
  const calls = []

  global.fetch = async (url, options = {}) => {
    const decodedUrl = decodeURIComponent(String(url))
    calls.push({ url: decodedUrl, options })

    if (decodedUrl.includes('/spreadsheet-id?fields=sheets(properties(sheetId,title))')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          sheets: [
            { properties: { title: 'Weapons', sheetId: 1 } },
            { properties: { title: 'Armor', sheetId: 2 } },
            { properties: { title: 'Accessories', sheetId: 3 } },
            { properties: { title: 'Enchantments', sheetId: 4 } },
          ],
        }),
      }
    }

    if (decodedUrl.includes("/values/'Weapons'!A:ZZ")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          values: [
            ['Blueprint Name', 'Category', 'Tier', 'Owned', 'Milestones', 'Ascension', 'Starforge', 'Transcendence', 'Starforge Unlocked', 'Notes'],
            ['Alpha Sword', 'Sword', '1', 'TRUE', '3', '2', '1', '1', 'TRUE', 'keep me'],
            ['Beta Sword', 'Sword', '1', 'TRUE', '5', '0', '0', '0', 'FALSE', 'keep me too'],
          ],
        }),
      }
    }

    if (
      decodedUrl.includes("/values/'Armor'!A:ZZ") ||
      decodedUrl.includes("/values/'Accessories'!A:ZZ") ||
      decodedUrl.includes("/values/'Enchantments'!A:ZZ")
    ) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ values: [] }),
      }
    }

    if (decodedUrl.includes('/values/') && options.method === 'PUT') {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({}),
      }
    }

    if (decodedUrl.includes(':batchUpdate') && options.method === 'POST') {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({}),
      }
    }

    throw new Error(`Unexpected fetch ${decodedUrl}`)
  }

  try {
    const didMigrate = await migrateLegacyBlueprintSchemaInPlace('token', 'spreadsheet-id')
    assert.equal(didMigrate, true)

    const putCalls = calls.filter((call) => call.options.method === 'PUT')
    const deleteCallIndex = calls.findIndex((call) => call.url.includes(':batchUpdate') && call.options.method === 'POST')
    assert.ok(putCalls.length >= 4)
    assert.ok(deleteCallIndex > -1)

    const firstPutIndex = calls.findIndex((call) => call.options.method === 'PUT')
    assert.ok(firstPutIndex > -1)
    assert.ok(deleteCallIndex > firstPutIndex)

    const milestonesWrite = putCalls.find((call) => call.url.includes("'Weapons'!E1:E3"))
    assert.ok(milestonesWrite)
    const milestonesBody = JSON.parse(milestonesWrite.options.body)
    assert.deepEqual(milestonesBody.values, [['Milestones'], ['4'], ['5']])

    const improveWrite = putCalls.find((call) => call.url.includes("'Weapons'!F1:F3"))
    assert.ok(improveWrite)
    const improveBody = JSON.parse(improveWrite.options.body)
    assert.deepEqual(improveBody.values, [['Improve'], ['3'], ['0']])

    const starforgeWrite = putCalls.find((call) => call.url.includes("'Weapons'!G1:G3"))
    assert.ok(starforgeWrite)
    const starforgeBody = JSON.parse(starforgeWrite.options.body)
    assert.deepEqual(starforgeBody.values, [['Starforge'], ['TRUE'], ['FALSE']])

    const milestonesWriteIndex = calls.findIndex((call) => call.options.method === 'PUT' && call.url.includes("'Weapons'!E1:E3"))
    const improveWriteIndex = calls.findIndex((call) => call.options.method === 'PUT' && call.url.includes("'Weapons'!F1:F3"))
    const starforgeWriteIndex = calls.findIndex((call) => call.options.method === 'PUT' && call.url.includes("'Weapons'!G1:G3"))
    assert.ok(milestonesWriteIndex > -1)
    assert.ok(improveWriteIndex > -1)
    assert.ok(starforgeWriteIndex > -1)
    assert.ok(milestonesWriteIndex < improveWriteIndex)
    assert.ok(improveWriteIndex < starforgeWriteIndex)

    const renameTypeHeader = putCalls.find((call) => call.url.includes("'Weapons'!B1"))
    assert.ok(renameTypeHeader)

    const deleteCall = calls[deleteCallIndex]
    const deleteBody = JSON.parse(deleteCall.options.body)
    const deleteRanges = deleteBody.requests.map((request) => request.deleteDimension.range)
    assert.deepEqual(deleteRanges, [
      { sheetId: 1, dimension: 'COLUMNS', startIndex: 8, endIndex: 9 },
      { sheetId: 1, dimension: 'COLUMNS', startIndex: 7, endIndex: 8 },
    ])
  } finally {
    global.fetch = originalFetch
  }
})
