import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getBlueprintItemIconName,
  getBlueprintItemIconPath,
  getGroupIconPath,
  getTypeIconName,
  getTypeIconPath,
  LUCIDE_ICONS,
} from './blueprintIcons.js'

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

test('group and type icon paths map to imported asset files', () => {
  assert.match(getGroupIconPath('Weapons'), /\/assets\/Groups\/weapon_group\.png$/)
  assert.match(getTypeIconPath('Aurasong'), /\/assets\/Types\/weapon_aurasong_type\.png$/)
  assert.match(getTypeIconPath('Spell'), /\/assets\/Types\/accessory_scrolls_type\.png$/)
})

test('icon path helpers return blank for unknown types or groups', () => {
  assert.equal(getGroupIconPath('Unknown Group'), '')
  assert.equal(getTypeIconPath('Unknown Type'), '')
  assert.equal(getBlueprintItemIconPath({}), '')
})

test('getBlueprintItemIconPath uses mapped item icons for Amulet/Aurasong and blanks when unmatched', () => {
  assert.match(getBlueprintItemIconPath({
    classification: { type: 'Amulet', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: './assets/Items/Amulets/accessory_amulet_t2_pendant.png' },
  }), /\/assets\/Items\/Amulets\/accessory_amulet_t2_pendant\.png$/)

  assert.equal(getBlueprintItemIconPath({
    classification: { type: 'Aurasong', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: '' },
  }), '')
})