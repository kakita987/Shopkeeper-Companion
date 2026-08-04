import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBlueprintSummary,
  buildDependencySummaryLine,
  getBlueprintVisuals,
  renderCollectionSection,
  renderInventorySection,
  renderUpgradeSection,
} from './blueprintView.js'

test('getBlueprintVisuals prefers classification data and falls back to structured meta type', () => {
  assert.deepEqual(getBlueprintVisuals({ classification: { group: 'Armor', type: 'Helmet' } }), {
    group: 'Armor',
    type: 'Helmet',
  })

  assert.deepEqual(getBlueprintVisuals({ structuredData: { meta: { type: 'Dagger' } } }), {
    group: 'Accessories',
    type: 'Dagger',
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

test('renderUpgradeSection uses one selector for Milestones then Starforge options', () => {
  const markup = renderUpgradeSection(
    {
      crafting: [{ name: 'Milestone 1' }, { name: 'Milestone 2' }],
      starforged: [{ name: 'Starforge 1' }],
      ascension: [{ name: 'Ascension 1' }],
    },
    'Alpha',
    { milestones: 1, starforge: 0, ascension: 0 },
    true,
    {
      getBlueprintStageValue: (progress, stageKey) => Number(progress?.[stageKey] || 0),
      getBlueprintStageOptions: (stageKey, progress) => {
        if (stageKey === 'milestones') {
          return [{ value: 0, label: 'Not started' }, { value: 1, label: 'M1' }, { value: 2, label: 'M2' }, { value: 3, label: 'M3' }, { value: 4, label: 'M4' }, { value: 5, label: 'M5' }]
        }

        if (stageKey === 'starforge') {
          return progress?.starforgeUnlocked
            ? [{ value: 0, label: 'Not started' }, { value: 1, label: 'S1' }, { value: 2, label: 'S2' }, { value: 3, label: 'S3' }, { value: 4, label: 'S4' }, { value: 5, label: 'S5' }]
            : [{ value: 0, label: 'Locked' }]
        }

        return [{ value: 0, label: `${stageKey}-locked` }, { value: 1, label: `${stageKey}-one` }]
      },
      escapeHtml: (value) => String(value),
    },
  )

  assert.match(markup, /<h5>Milestones<\/h5>/)
  assert.match(markup, /data-stage-key="milestones-starforge"/)
  assert.match(markup, /starforge-unlock-checkbox/)
  assert.doesNotMatch(markup, /data-stage-key="milestones"/)
  assert.doesNotMatch(markup, /data-stage-key="starforge"/)
  assert.match(markup, /1\. Milestones · M1/)
  assert.match(markup, /5\. Milestones · M5/)
  assert.match(markup, /6\. Starforge · S1 \(Locked\)/)
  assert.match(markup, /10\. Starforge · S5 \(Locked\)/)
  assert.match(markup, /data-stage-key="ascension-transcendence"/)
  assert.doesNotMatch(markup, /data-stage-key="ascension"/)
  assert.doesNotMatch(markup, /data-stage-key="transcendence"/)
  assert.match(markup, /1\. Improve · ascension-one[\s\S]*2\. Transcendence · transcendence-one/)
})

test('renderInventorySection shows all quality labels including Normal', () => {
  const markup = renderInventorySection(
    { inventory: { normal: 1, superior: 2, flawless: 3, epic: 4, legendary: 5 } },
    {
      getQualityClass: (label) => `quality-${label.toLowerCase()}`,
      escapeHtml: (value) => String(value),
    },
  )

  assert.match(markup, /inventory-quality-label">Normal</)
  assert.match(markup, /inventory-quality-label">Superior</)
  assert.match(markup, /inventory-quality-label">Flawless</)
  assert.match(markup, /inventory-quality-label">Epic</)
  assert.match(markup, /inventory-quality-label">Legendary</)
})

test('renderCollectionSection shows collection quality labels', () => {
  const markup = renderCollectionSection(
    { collectionBook: { superior: true, flawless: false, epic: true, legendary: false } },
    true,
    {
      getQualityClass: (label) => `quality-${label.toLowerCase()}`,
      escapeHtml: (value) => String(value),
    },
  )

  assert.match(markup, /inventory-quality-label">Superior</)
  assert.match(markup, /inventory-quality-label">Flawless</)
  assert.match(markup, /inventory-quality-label">Epic</)
  assert.match(markup, /inventory-quality-label">Legendary</)
})
