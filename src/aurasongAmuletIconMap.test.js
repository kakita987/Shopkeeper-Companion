import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyAurasongAmuletTypeMap,
  buildAurasongAmuletIconMapFromImport,
  buildAurasongAmuletIconMapFromItems,
  indexAurasongAmuletIconMap,
  toAurasongAmuletIconMapCsv,
} from './assets/accessoryIconMap.js'

test('buildAurasongAmuletIconMapFromImport derives names and tiers from importer rows', () => {
  const mapRows = buildAurasongAmuletIconMapFromImport(
    ['Blueprint Name', 'Type', 'Tier'],
    [
      ['Pendant', 'Amulet', '2'],
      ['Aura of Rain', 'Aurasong', '4'],
      ['Iron Helm', 'Helmet', '1'],
    ],
    [],
  )

  assert.equal(mapRows.length, 2)
  assert.deepEqual(mapRows.map((row) => `${row.type}:${row.tier}:${row.blueprintName}`), [
    'Amulet:2:Pendant',
    'Aurasong:4:Aura of Rain',
  ])
  assert.match(mapRows[0].typeIconPath, /\/assets\/Accessory\/accessory_amulet_type\.png$/)
  assert.match(mapRows[1].typeIconPath, /\/assets\/Weapon\/weapon_aurasong_type\.png$/)
  assert.match(mapRows[0].itemIconRelativePath, /\/assets\/Accessory\/accessory_amulet_t2_pendant\.png$/)
  assert.match(mapRows[1].itemIconRelativePath, /\/assets\/Accessory\/accessory_aurasong_t4_aura_rains\.png$/)
})

test('buildAurasongAmuletIconMapFromImport falls back to unique type+tier icon when name differs', () => {
  const mapRows = buildAurasongAmuletIconMapFromImport(
    ['Blueprint Name', 'Type', 'Tier'],
    [
      ['Memento', 'Amulet', '1'],
    ],
    [],
  )

  assert.equal(mapRows.length, 1)
  assert.equal(mapRows[0].blueprintName, 'Memento')
  assert.equal(mapRows[0].tier, 1)
  assert.match(mapRows[0].itemIconRelativePath, /\/assets\/Accessory\/accessory_amulet_t1_ironamulet\.png$/)
})

test('buildAurasongAmuletIconMapFromItems resolves spell art by name and tier', () => {
  const mapRows = buildAurasongAmuletIconMapFromItems([
    {
      name: 'Scroll of Cleansing',
      meta: 'Tier 1',
      structuredData: {},
      classification: { group: 'Accessories', type: 'Spell' },
    },
  ])

  assert.equal(mapRows.length, 1)
  assert.equal(mapRows[0].itemIconRelativePath, './assets/Accessory/accessory_spell_t1_scroll_of_cleansing.png')
})

test('buildAurasongAmuletIconMapFromImport infers target type from Accessory rows', () => {
  const mapRows = buildAurasongAmuletIconMapFromImport(
    ['Blueprint Name', 'Type', 'Tier'],
    [
      ['Memento', 'Accessory', '1'],
      ['Aura of Rain', 'Accessory', '4'],
    ],
    [],
  )

  assert.equal(mapRows.length, 2)
  const byKey = indexAurasongAmuletIconMap(mapRows)
  assert.ok(['Amulet', 'Shield'].includes(byKey['memento::1']?.type))
  assert.equal(byKey['auraofrain::4']?.type, 'Aurasong')
})

test('buildAurasongAmuletIconMapFromItems supports structured tier and meta-tier fallback', () => {
  const mapRows = buildAurasongAmuletIconMapFromItems([
    {
      name: 'Monsoon Heart',
      meta: 'Tier 11',
      structuredData: {},
      classification: { group: 'Accessories', type: 'Amulet' },
    },
    {
      name: 'Aura Reactor',
      meta: 'No tier',
      structuredData: { meta: { tier: 16 } },
      classification: { group: 'Accessories', type: 'Aurasong' },
    },
    {
      name: 'Ignore Me',
      meta: 'Tier 4',
      structuredData: { meta: { tier: 4 } },
      classification: { group: 'Armor', type: 'Helmet' },
    },
  ])

  assert.equal(mapRows.length, 2)
  assert.deepEqual(mapRows.map((row) => row.tier), [11, 16])

  const byKey = indexAurasongAmuletIconMap(mapRows)
  assert.equal(byKey['monsoonheart::11']?.type, 'Amulet')
  assert.equal(byKey['aurareactor::16']?.type, 'Aurasong')
})

test('toAurasongAmuletIconMapCsv serializes deterministic headers and rows', () => {
  const csv = toAurasongAmuletIconMapCsv([
    {
      blueprintName: 'Lucky Medallion',
      tier: 5,
      group: 'Accessories',
      type: 'Amulet',
      typeIconPath: '/assets/Accessory/accessory_amulet_type.png',
      itemIconRelativePath: './assets/Accessory/accessory_amulet_t5_luckymedallion.png',
      lookupKey: 'luckymedallion::5',
    },
  ])

  const lines = csv.split('\n')
  assert.equal(lines[0], 'blueprintName,tier,group,type,typeIconPath,itemIconRelativePath,lookupKey')
  assert.equal(lines[1], 'Lucky Medallion,5,Accessories,Amulet,/assets/Accessory/accessory_amulet_type.png,./assets/Accessory/accessory_amulet_t5_luckymedallion.png,luckymedallion::5')
})

test('applyAurasongAmuletTypeMap forces mapped Aurasong/Amulet types by name+tier key', () => {
  const mapRows = buildAurasongAmuletIconMapFromImport(
    ['Blueprint Name', 'Type', 'Tier'],
    [
      ['Pendant', 'Amulet', '2'],
      ['Aura of Rain', 'Aurasong', '4'],
    ],
    [],
  )

  const corrected = applyAurasongAmuletTypeMap([
    {
      name: 'Pendant',
      meta: 'Tier 2',
      structuredData: { meta: { tier: 2 } },
      classification: { group: 'Accessories', type: 'Accessory' },
    },
    {
      name: 'Aura of Rain',
      meta: 'Tier 4',
      structuredData: { meta: { tier: 4 } },
      classification: { group: 'Accessories', type: 'Accessory' },
    },
    {
      name: 'Iron Helm',
      meta: 'Tier 1',
      structuredData: { meta: { tier: 1 } },
      classification: { group: 'Armor', type: 'Helmet' },
    },
  ], mapRows)

  assert.equal(corrected[0].classification.type, 'Amulet')
  assert.equal(corrected[1].classification.type, 'Aurasong')
  assert.equal(corrected[2].classification.type, 'Helmet')
  assert.match(corrected[0].iconMapping?.itemIconRelativePath || '', /\/assets\/Accessory\/accessory_amulet_t2_pendant\.png$/)
  assert.match(corrected[1].iconMapping?.itemIconRelativePath || '', /\/assets\/Accessory\/accessory_aurasong_t4_aura_rains\.png$/)
})