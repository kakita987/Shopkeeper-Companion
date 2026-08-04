import test from 'node:test'
import assert from 'node:assert/strict'
import { getBlueprintStageValue, getBlueprintStageOptions } from './blueprintStageOptions.js'

const CRAFT_ENTRIES = [
  { name: 'Iron Ingot', count: 5 },
  { name: 'Steel Plate', count: 3 },
  { name: 'Enchanted Core', count: 1 },
]

test('returns 0 for a missing stage key', () => {
  assert.equal(getBlueprintStageValue({}, 'milestones'), 0)
})

test('returns the stored numeric stage value', () => {
  assert.equal(getBlueprintStageValue({ milestones: 2 }, 'milestones'), 2)
})

test('returns 0 for negative and non-finite values', () => {
  assert.equal(getBlueprintStageValue({ milestones: -1 }, 'milestones'), 0)
  assert.equal(getBlueprintStageValue({ milestones: NaN }, 'milestones'), 0)
  assert.equal(getBlueprintStageValue({ milestones: Infinity }, 'milestones'), 0)
})

test('always includes Not started as the first option', () => {
  const [first] = getBlueprintStageOptions('milestones', {}, CRAFT_ENTRIES)
  assert.equal(first.value, 0)
  assert.equal(first.label, 'Not started')
})

test('generates one option per imported entry', () => {
  const options = getBlueprintStageOptions('milestones', {}, CRAFT_ENTRIES)
  assert.equal(options.length, CRAFT_ENTRIES.length + 1)
})

test('uses imported entry names as labels', () => {
  const options = getBlueprintStageOptions('milestones', {}, CRAFT_ENTRIES)
  assert.equal(options[1].label, 'Iron Ingot')
  assert.equal(options[2].label, 'Steel Plate')
  assert.equal(options[3].label, 'Enchanted Core')
})

test('falls back to generic labels when entries are empty', () => {
  assert.deepEqual(getBlueprintStageOptions('milestones', {}, []), [
    { value: 0, label: 'Not started' },
    { value: 1, label: 'Unlocked' },
    { value: 2, label: 'Completed' },
  ])
})

test('locks later stages until the previous one has any progress', () => {
  const options = getBlueprintStageOptions('starforge', { milestones: 0, starforgeUnlocked: false }, CRAFT_ENTRIES)
  assert.deepEqual(options, [{ value: 0, label: 'Locked' }])
})

test('requires the Starforge unlock key before Starforge becomes available', () => {
  const lockedOptions = getBlueprintStageOptions('starforge', { milestones: 5, starforgeUnlocked: false }, CRAFT_ENTRIES)
  assert.deepEqual(lockedOptions, [{ value: 0, label: 'Locked' }])

  const unlockedOptions = getBlueprintStageOptions('starforge', { milestones: 0, starforgeUnlocked: true }, CRAFT_ENTRIES)
  assert.equal(unlockedOptions.length, CRAFT_ENTRIES.length + 1)
})

test('keeps Ascension and Transcendence available without extra prerequisites', () => {
  const ascensionOptions = getBlueprintStageOptions('ascension', { milestones: 0 }, CRAFT_ENTRIES)
  const transcendenceOptions = getBlueprintStageOptions('transcendence', { milestones: 0 }, CRAFT_ENTRIES)

  assert.equal(ascensionOptions.length, CRAFT_ENTRIES.length + 1)
  assert.equal(transcendenceOptions.length, CRAFT_ENTRIES.length + 1)
})
