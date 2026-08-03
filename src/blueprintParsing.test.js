import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBlueprintItems, convertBlueprintRowToObject } from './blueprintParsing.js'

test('convertBlueprintRowToObject parses row data into blueprint structure', () => {
  const headers = [
    'Name',
    'Category',
    'Tier',
    'Value',
    'Crafting Time (seconds)',
    'Required Worker',
    'Worker Level',
    'Component',
    'Component Quality',
    'Component Count',
    'ATK',
    'Crafting Upgrade 1',
    'Crafting Upgrade 1 Count',
  ]
  const row = [
    'Test Sword',
    'Sword',
    '3',
    '1200',
    '45',
    'Blacksmith',
    '12',
    'Iron Bar',
    'Superior',
    '2',
    '15',
    'Step One',
    '1',
  ]

  const blueprint = convertBlueprintRowToObject(headers, row)

  assert.equal(blueprint.meta.name, 'Test Sword')
  assert.equal(blueprint.meta.category, 'Sword')
  assert.equal(blueprint.meta.tier, 3)
  assert.equal(blueprint.economy.value, 1200)
  assert.equal(blueprint.economy.craftingTimeSeconds, 45)
  assert.deepEqual(blueprint.workers, [{ name: 'Blacksmith', level: 12 }])
  assert.deepEqual(blueprint.materials.components, [{ name: 'Iron Bar', quality: 'Superior', count: 2 }])
  assert.equal(blueprint.stats.atk, 15)
  assert.equal(blueprint.upgrades.crafting[0].name, 'Step One')
  assert.equal(blueprint.upgrades.crafting[0].count, 1)
})

test('buildBlueprintItems classifies cached and tabular blueprint data', () => {
  const cachedItems = buildBlueprintItems([], [], [
    { meta: { name: 'Cached Blade', category: 'Sword', tier: 1 } },
  ])
  assert.equal(cachedItems[0].name, 'Cached Blade')
  assert.equal(cachedItems[0].classification.category, 'Weapons')

  const tabularItems = buildBlueprintItems(
    ['Name', 'Category', 'Tier'],
    [['Blue Cloak', 'Cloak', '2']],
    [],
  )

  assert.equal(tabularItems[0].name, 'Blue Cloak')
  assert.equal(tabularItems[0].classification.category, 'Accessories')
  assert.equal(tabularItems[0].classification.type, 'Cloak')
})
