import test from 'node:test'
import assert from 'node:assert/strict'
import { BLUEPRINT_GROUP_TYPE_ORDER } from './assets/blueprintTypeOrder.js'
import {
  getBlueprintItemIconPath,
  getGroupIconPath,
  getTypeIconPath,
  LUCIDE_ICONS,
} from './blueprintIcons.js'

test('LUCIDE_ICONS still exposes the icons used by the app shell', () => {
  assert.equal(typeof LUCIDE_ICONS.Sword, 'object')
  assert.equal(typeof LUCIDE_ICONS.Shield, 'object')
  assert.equal(typeof LUCIDE_ICONS.CircleDashed, 'object')
})

test('group and type icon paths map to imported asset files', () => {
  assert.match(getGroupIconPath('Weapons'), /\/assets\/Weapon\/weapon_group\.png$/)
  assert.match(getTypeIconPath('Aurasong'), /\/assets\/Accessory\/accessory_aurasong_type\.png$/)
  assert.match(getTypeIconPath('Spell'), /\/assets\/Accessory\/accessory_scrolls_type\.png$/)
  assert.match(getTypeIconPath('Mask'), /\/assets\/Armor\/armor_mask_type\.png$/)
  assert.match(getTypeIconPath('Scythe'), /\/assets\/Weapon\/weapon_scythe_type\.png$/)
})

test('every configured blueprint type has a placeholder icon', () => {
  BLUEPRINT_GROUP_TYPE_ORDER.forEach(({ types }) => {
    types.forEach((type) => assert.ok(getTypeIconPath(type), `Missing type icon for ${type}`))
  })
})

test('icon path helpers return blank without a configured classification', () => {
  assert.equal(getGroupIconPath('Unknown Group'), '')
  assert.equal(getTypeIconPath('Unknown Type'), '')
  assert.equal(getBlueprintItemIconPath({}), '')
})

test('getBlueprintItemIconPath resolves exact compact item assets', () => {
  const cases = [
    {
      item: {
        name: 'Jade Pendant',
        classification: { type: 'Amulet', group: 'Accessories' },
        structuredData: { meta: { tier: 2 } },
      },
      expected: /\/assets\/Accessory\/amulet_t2_jade_pendant\.png$/,
    },
    {
      item: {
        name: 'Esper Intemporal',
        classification: { type: 'Scythe', group: 'Weapons' },
        structuredData: { meta: { tier: 16 } },
      },
      expected: /\/assets\/Weapon\/scythe_t16_esper_intemporal\.png$/,
    },
    {
      item: {
        name: 'Autumnal Mask',
        classification: { type: 'Mask', group: 'Armor' },
        structuredData: { meta: { tier: 6 } },
      },
      expected: /\/assets\/Armor\/mask_t6_autumnal_mask\.png$/,
    },
    {
      item: {
        name: 'Bear Spirit',
        classification: { type: 'Spirit', group: 'Enchantments' },
        structuredData: { meta: { tier: 9 } },
      },
      expected: /\/assets\/Enchantment\/spirit_t9_bear_spirit\.png$/,
    },
  ]

  cases.forEach(({ item, expected }) => assert.match(getBlueprintItemIconPath(item), expected))
})

test('getBlueprintItemIconPath uses the type icon when exact art is unavailable', () => {
  const missingLicensedItemPath = getBlueprintItemIconPath({
    name: 'Unavailable Avatar Blueprint',
    classification: { type: 'Quiver', group: 'Accessories' },
    structuredData: { meta: { tier: 14 } },
  })
  assert.equal(missingLicensedItemPath, getTypeIconPath('Quiver'))

  const nearNamePath = getBlueprintItemIconPath({
    name: 'Jade Pendants',
    classification: { type: 'Amulet', group: 'Accessories' },
    structuredData: { meta: { tier: 2 } },
  })
  assert.equal(nearNamePath, getTypeIconPath('Amulet'))

  const wrongTierPath = getBlueprintItemIconPath({
    name: 'Jade Pendant',
    classification: { type: 'Amulet', group: 'Accessories' },
    structuredData: { meta: { tier: 3 } },
  })
  assert.equal(wrongTierPath, getTypeIconPath('Amulet'))
})
