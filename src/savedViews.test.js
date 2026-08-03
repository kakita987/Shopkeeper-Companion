import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SAVED_VIEW_CRITERIA,
  STARTER_VIEW_PRESETS,
  buildSavedViewsRows,
  hasActiveSavedViewFilters,
  loadSavedFilterViews,
  normalizeSavedViewCriteria,
  parseSavedViewsRows,
} from './savedViews.js'

test('normalizeSavedViewCriteria keeps invalid values on the default path', () => {
  assert.deepEqual(normalizeSavedViewCriteria({}), DEFAULT_SAVED_VIEW_CRITERIA)
  assert.deepEqual(normalizeSavedViewCriteria({ collection: 'legendary' }).collectionBook, ['legendary'])
})

test('saved view presets stay anchored to the default criteria shape', () => {
  assert.equal(STARTER_VIEW_PRESETS[0].criteria.dependency, 'dependent')
  assert.equal(STARTER_VIEW_PRESETS[1].criteria.dependency, 'needed')
})

test('saved view rows round-trip through parse and build helpers', () => {
  const rows = [
    ['view-1', 'Owned View', 'any', 'owned', 'has', 'mastered', '["superior","epic"]'],
  ]

  const views = parseSavedViewsRows(rows)
  assert.equal(views[0].name, 'Owned View')
  assert.deepEqual(views[0].criteria.collectionBook, ['superior', 'epic'])
  assert.deepEqual(buildSavedViewsRows(views), rows)
})

test('loadSavedFilterViews returns cleaned views from storage and tolerates missing storage', () => {
  const storage = {
    getItem(key) {
      if (key === 'shopkeeper-saved-filter-views') {
        return JSON.stringify([
          { id: ' view-2 ', name: ' My View ', criteria: { dependency: 'dependent' } },
        ])
      }

      return null
    },
  }

  const loaded = loadSavedFilterViews(storage)
  assert.equal(loaded[0].id, 'view-2')
  assert.equal(loaded[0].criteria.dependency, 'dependent')
  assert.deepEqual(loadSavedFilterViews(null), [])
})

test('hasActiveSavedViewFilters only reports non-default filters', () => {
  assert.equal(hasActiveSavedViewFilters({}), false)
  assert.equal(hasActiveSavedViewFilters({ ownership: 'owned' }), true)
})
