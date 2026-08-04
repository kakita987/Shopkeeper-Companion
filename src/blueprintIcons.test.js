import test from 'node:test'
import assert from 'node:assert/strict'
import { getBlueprintItemIconName, getTypeIconName, LUCIDE_ICONS } from './blueprintIcons.js'

test('LUCIDE_ICONS still exposes the icons used by the app shell', () => {
  assert.equal(typeof LUCIDE_ICONS.Sword, 'object')
  assert.equal(typeof LUCIDE_ICONS.Shield, 'object')
  assert.equal(typeof LUCIDE_ICONS.CircleDashed, 'object')
})

test('getTypeIconName maps common blueprint types to the expected icon names', () => {
  assert.equal(getTypeIconName('Heavy Armor', 'Armor'), 'Shield')
  assert.equal(getTypeIconName('Rogue Hat', 'Armor'), 'HatGlasses')
  assert.equal(getTypeIconName('Aurasong', 'Accessories'), 'Music2')
  assert.equal(getTypeIconName('Unknown Type', 'Weapons'), 'Swords')
})

test('getBlueprintItemIconName reads classification data safely', () => {
  assert.equal(getBlueprintItemIconName({ classification: { type: 'Dessert', group: 'Accessories' } }), 'CakeSlice')
  assert.equal(getBlueprintItemIconName({}), 'CircleDashed')
})