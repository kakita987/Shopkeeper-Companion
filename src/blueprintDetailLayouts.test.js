import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BLUEPRINT_DETAIL_LAYOUT_STORAGE_KEY,
  BLUEPRINT_DETAIL_SECTIONS,
  getBlueprintDetailLayoutSections,
  loadBlueprintDetailLayout,
  moveCustomLayoutSection,
  normalizeBlueprintDetailLayout,
  parseBlueprintDetailLayoutSetting,
  resetCustomBlueprintDetailLayout,
  saveBlueprintDetailLayout,
  setCustomLayoutSectionVisibility,
} from './blueprintDetailLayouts.js'

test('layout normalization keeps one complete custom layout and valid active preset', () => {
  const layout = normalizeBlueprintDetailLayout({
    activePreset: 'unknown',
    custom: {
      order: ['materials', 'materials', 'retired-section'],
      hidden: ['stats', 'retired-section'],
    },
  })

  assert.equal(layout.activePreset, 'overview')
  assert.deepEqual(layout.custom.order, ['materials', 'stats', 'upgrades', 'inventory'])
  assert.deepEqual(layout.custom.hidden, ['stats'])
})

test('built-in layouts provide goal-based section orders', () => {
  assert.deepEqual(getBlueprintDetailLayoutSections({ activePreset: 'overview' }), [
    'upgrades', 'inventory', 'materials', 'stats',
  ])
  assert.deepEqual(getBlueprintDetailLayoutSections({ activePreset: 'crafting' }).slice(0, 2), ['materials', 'stats'])
  assert.deepEqual(getBlueprintDetailLayoutSections({ activePreset: 'inventory' }).slice(0, 2), ['inventory', 'upgrades'])

  for (const activePreset of ['overview', 'crafting', 'inventory', 'custom']) {
    const sections = getBlueprintDetailLayoutSections({
      activePreset,
      custom: { order: ['stats', 'inventory', 'upgrades', 'materials'] },
    })
    assert.equal(sections.indexOf('stats'), sections.indexOf('materials') + 1)
  }
})

test('legacy collection placement and visibility migrate to merged inventory', () => {
  const layout = normalizeBlueprintDetailLayout({
    activePreset: 'custom',
    custom: {
      order: ['materials', 'collection', 'inventory', 'stats'],
      hidden: ['collection'],
    },
  })

  assert.deepEqual(layout.custom.order, ['materials', 'stats', 'inventory', 'upgrades'])
  assert.deepEqual(layout.custom.hidden, ['inventory'])
})

test('custom layout supports moving and visibility without hiding every section', () => {
  let layout = normalizeBlueprintDetailLayout({ activePreset: 'custom' })
  layout = moveCustomLayoutSection(layout, 'materials', 'up')
  assert.deepEqual(layout.custom.order, ['upgrades', 'materials', 'stats', 'inventory'])

  layout = moveCustomLayoutSection(layout, 'stats', 'down')
  assert.deepEqual(layout.custom.order, ['upgrades', 'inventory', 'materials', 'stats'])

  BLUEPRINT_DETAIL_SECTIONS.forEach((section) => {
    layout = setCustomLayoutSectionVisibility(layout, section.id, false)
  })

  assert.equal(getBlueprintDetailLayoutSections(layout).length, 1)
  assert.equal(layout.custom.hidden.length, BLUEPRINT_DETAIL_SECTIONS.length - 1)
})

test('layout persistence and remote setting parsing tolerate malformed values', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const saved = saveBlueprintDetailLayout({ activePreset: 'crafting' }, storage)

  assert.equal(loadBlueprintDetailLayout(storage).activePreset, 'crafting')
  assert.deepEqual(JSON.parse(values.get(BLUEPRINT_DETAIL_LAYOUT_STORAGE_KEY)), saved)
  assert.equal(parseBlueprintDetailLayoutSetting('{broken'), null)
  assert.equal(parseBlueprintDetailLayoutSetting(''), null)
})

test('reset restores the single custom layout without changing built-in definitions', () => {
  const reset = resetCustomBlueprintDetailLayout({
    activePreset: 'inventory',
    custom: { order: ['stats'], hidden: ['inventory'] },
  })

  assert.equal(reset.activePreset, 'custom')
  assert.deepEqual(reset.custom.order, BLUEPRINT_DETAIL_SECTIONS.map((section) => section.id))
  assert.deepEqual(reset.custom.hidden, [])
})