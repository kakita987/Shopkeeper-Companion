import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCsvText,
  exportBlueprintProgressCsvText,
  importBlueprintProgressCsvText,
  parseCsvText,
  toCsvField,
} from './blueprintCsv.js'

test('toCsvField escapes commas, quotes, and newlines', () => {
  assert.equal(toCsvField('plain'), 'plain')
  assert.equal(toCsvField('one,two'), '"one,two"')
  assert.equal(toCsvField('a "quote"'), '"a ""quote"""')
  assert.equal(toCsvField('two\nlines'), '"two\nlines"')
})

test('buildCsvText and parseCsvText round trip quoted fields', () => {
  const headers = ['Name', 'Notes']
  const rows = [['Sword, Sharp', 'Line one\nLine "two"']]
  assert.deepEqual(parseCsvText(buildCsvText(headers, rows)), [headers, ...rows])
})

test('blueprint progress CSV exports and imports the current schema', () => {
  const items = [{
    name: 'Test Sword',
    classification: { group: 'Weapons', type: 'Sword' },
    structuredData: { meta: { type: 'Sword', tier: 3 } },
  }]
  const sourceProgress = {
    'Test Sword': {
      owned: true,
      starforgeUnlocked: true,
      milestones: 5,
      starforge: 2,
      ascension: 3,
      transcendence: 1,
      inventory: { normal: 4, superior: 2 },
      collectionBook: { superior: true, flawless: false, epic: true, legendary: false },
    },
  }

  const csvText = exportBlueprintProgressCsvText(items, sourceProgress)
  const parsedRows = parseCsvText(csvText)
  assert.equal(parsedRows[0][0], 'Group')
  assert.equal(parsedRows[1][0], 'Weapons')

  const { progress, rowCount } = importBlueprintProgressCsvText(csvText, {})
  assert.equal(rowCount, 1)
  assert.equal(progress['Test Sword'].owned, true)
  assert.equal(progress['Test Sword'].milestones, 5)
  assert.equal(progress['Test Sword'].starforge, 2)
  assert.equal(progress['Test Sword'].ascension, 3)
  assert.equal(progress['Test Sword'].transcendence, 1)
  assert.equal(progress['Test Sword'].inventory.normal, 4)
  assert.equal(progress['Test Sword'].collectionBook.epic, true)
})

test('CSV snapshots include every blueprint group with default progress values', () => {
  const items = [
    {
      name: 'Starter Sword',
      classification: { group: 'Weapons', type: 'Sword' },
      structuredData: { meta: { type: 'Sword', tier: 1 } },
    },
    {
      name: 'Starter Shield',
      classification: { group: 'Armor', type: 'Shield' },
      structuredData: { meta: { type: 'Shield', tier: 1 } },
    },
    {
      name: 'Starter Ring',
      classification: { group: 'Accessories', type: 'Ring' },
      structuredData: { meta: { type: 'Ring', tier: 1 } },
    },
  ]

  const rows = parseCsvText(exportBlueprintProgressCsvText(items, {}))
  const headers = rows[0]
  const dataRows = rows.slice(1)
  const groups = dataRows.map((row) => row[headers.indexOf('Group')])

  assert.deepEqual(groups, ['Weapons', 'Armor', 'Accessories'])
  dataRows.forEach((row) => {
    assert.equal(row[headers.indexOf('Inventory Normal')], '0')
    assert.equal(row[headers.indexOf('Owned')], 'FALSE')
    assert.equal(row[headers.indexOf('Starforge')], 'FALSE')
    assert.equal(row[headers.indexOf('Milestones')], '0')
    assert.equal(row[headers.indexOf('Improve')], '0')
  })
})

test('import rejects CSV files without Blueprint Name', () => {
  assert.throws(
    () => importBlueprintProgressCsvText('Name,Owned\r\nSword,TRUE\r\n'),
    /Blueprint Name/
  )
})