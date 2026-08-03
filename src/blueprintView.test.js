import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBlueprintSummary, buildDependencySummaryLine, getBlueprintVisuals } from './blueprintView.js'

test('getBlueprintVisuals prefers classification data and falls back to structured meta category', () => {
  assert.deepEqual(getBlueprintVisuals({ classification: { category: 'Armor', type: 'Helmet' } }), {
    group: 'Armor',
    category: 'Helmet',
  })

  assert.deepEqual(getBlueprintVisuals({ structuredData: { meta: { category: 'Dagger' } } }), {
    group: 'Accessories',
    category: 'Dagger',
  })
})

test('buildDependencySummaryLine summarizes dependency relationships', () => {
  assert.equal(buildDependencySummaryLine({}), 'No dependency relation')
  assert.equal(buildDependencySummaryLine({ isDependentOn: true }), 'Dependent')
  assert.equal(buildDependencySummaryLine({ isNeededFor: true, dependentNames: ['Alpha', 'Beta'] }), 'Needed (2)')
})

test('buildBlueprintSummary combines progress, inventory, and dependency state', () => {
  const summary = buildBlueprintSummary(
    {
      name: 'Alpha',
      structuredData: {
        upgrades: {
          crafting: [{ name: 'Step 1' }, { name: 'Step 2' }, { name: 'Step 3' }, { name: 'Step 4' }, { name: 'Step 5' }],
        },
      },
    },
    {
      dependentsByComponent: new Map([['alpha', new Set(['Beta'])]]),
      blueprintNames: new Set(['alpha', 'beta']),
    },
    {
      getBlueprintProgressState: () => ({
        owned: true,
        master: true,
        inventory: { superior: 2 },
        collectionBook: { superior: true },
      }),
      calculateTotalInventory: () => 2,
      getCollectionBookStatus: () => '✅ Complete',
      getBlueprintMilestoneKeys: (blueprintName, entries) => entries.map((entry, index) => `${blueprintName}::crafting::${index}::${entry.name || 'Unlock'}`),
      isTrackedUpgrade: () => true,
      getBlueprintMaterials: () => ({ components: [{ name: 'Beta' }] }),
    },
  )

  assert.equal(summary.isOwned, true)
  assert.equal(summary.isMastered, true)
  assert.equal(summary.isDependentOn, true)
  assert.equal(summary.isNeededFor, true)
  assert.equal(summary.totalInventory, 2)
  assert.equal(summary.hasSuperiorOrBetterInventory, true)
  assert.equal(summary.isCollectionComplete, true)
  assert.equal(summary.collectionStatus, '✅ Complete')
})
