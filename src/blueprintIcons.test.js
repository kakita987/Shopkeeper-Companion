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
  assert.match(getGroupIconPath('Weapons'), /\/assets\/Weapon\/weapon_group\.png$/)
  assert.match(getTypeIconPath('Aurasong'), /\/assets\/Weapon\/weapon_aurasong_type\.png$/)
  assert.match(getTypeIconPath('Spell'), /\/assets\/Accessory\/accessory_scrolls_type\.png$/)
})

test('icon path helpers return blank for unknown types or groups', () => {
  assert.equal(getGroupIconPath('Unknown Group'), '')
  assert.equal(getTypeIconPath('Unknown Type'), '')
  assert.equal(getBlueprintItemIconPath({}), '')
})

test('getBlueprintItemIconPath uses mapped item icons for accessory types and blanks when unmatched', () => {
  assert.match(getBlueprintItemIconPath({
    classification: { type: 'Amulet', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: './assets/Accessory/accessory_amulet_t2_jade_pendant.png' },
  }), /\/assets\/Accessory\/accessory_amulet_t2_jade_pendant\.png$/)

  assert.match(getBlueprintItemIconPath({
    classification: { type: 'Spell', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: './assets/Accessory/accessory_spell_t1_scroll_of_cleansing.png' },
  }), /\/assets\/Accessory\/accessory_spell_t1_scroll_of_cleansing\.png$/)

  assert.match(getBlueprintItemIconPath({
    classification: { type: 'Shield', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: './assets/Accessory/accessory_shield_t1_wooden_shield.png' },
  }), /\/assets\/Accessory\/accessory_shield_t1_wooden_shield\.png$/)

  assert.match(getBlueprintItemIconPath({
    classification: { type: 'Quiver', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: './assets/Accessory/accessory_quiver_t9_knightly_quiver.png' },
  }), /\/assets\/Accessory\/accessory_quiver_t9_knightly_quiver\.png$/)

  assert.match(getBlueprintItemIconPath({
    classification: { type: 'Potion', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: './assets/Accessory/accessory_potion_t2_healing_potion.png' },
  }), /\/assets\/Accessory\/accessory_potion_t2_healing_potion\.png$/)

  assert.match(getBlueprintItemIconPath({
    classification: { type: 'Ring', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: './assets/Accessory/accessory_ring_t1_iron_ring.png' },
  }), /\/assets\/Accessory\/accessory_ring_t1_iron_ring\.png$/)

  assert.match(getBlueprintItemIconPath({
    classification: { type: 'Meal', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: './assets/Accessory/accessory_meal_t3_bacon_and_eggs.png' },
  }), /\/assets\/Accessory\/accessory_meal_t3_bacon_and_eggs\.png$/)

  assert.match(getBlueprintItemIconPath({
    classification: { type: 'Herbal Medicine', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: './assets/Accessory/accessory_herbal_medicine_t2_sweet_grass.png' },
  }), /\/assets\/Accessory\/accessory_herbal_medicine_t2_sweet_grass\.png$/)

  assert.match(getBlueprintItemIconPath({
    classification: { type: 'Familiar', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: './assets/Accessory/accessory_familiar_t3_troublin.png' },
  }), /\/assets\/Accessory\/accessory_familiar_t3_troublin\.png$/)

  assert.match(getBlueprintItemIconPath({
    classification: { type: 'Dessert', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: './assets/Accessory/accessory_dessert_t3_cookie_plate.png' },
  }), /\/assets\/Accessory\/accessory_dessert_t3_cookie_plate\.png$/)

  assert.match(getBlueprintItemIconPath({
    classification: { type: 'Cloak', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: './assets/Accessory/accessory_cloak_t3_adventurer_cloak.png' },
  }), /\/assets\/Accessory\/accessory_cloak_t3_adventurer_cloak\.png$/)

  assert.match(getBlueprintItemIconPath({
    name: 'Scroll of Cleansing',
    classification: { type: 'Spell', group: 'Accessories' },
    structuredData: { meta: { tier: 1 } },
  }), /\/assets\/Accessory\/accessory_spell_t1_scroll_of_cleansing\.png$/)

  assert.match(getBlueprintItemIconPath({
    name: 'Knightly Quiver',
    classification: { type: 'Quiver', group: 'Accessories' },
    structuredData: { meta: { tier: 9 } },
  }), /\/assets\/Accessory\/accessory_quiver_t9_knightly_quiver\.png$/)

  assert.match(getBlueprintItemIconPath({
    name: 'Healing Potion',
    classification: { type: 'Potion', group: 'Accessories' },
    structuredData: { meta: { tier: 2 } },
  }), /\/assets\/Accessory\/accessory_potion_t2_healing_potion\.png$/)

  assert.match(getBlueprintItemIconPath({
    name: 'Iron Ring',
    classification: { type: 'Ring', group: 'Accessories' },
    structuredData: { meta: { tier: 1 } },
  }), /\/assets\/Accessory\/accessory_ring_t1_iron_ring\.png$/)

  assert.match(getBlueprintItemIconPath({
    name: 'Bacon and Eggs',
    classification: { type: 'Meal', group: 'Accessories' },
    structuredData: { meta: { tier: 3 } },
  }), /\/assets\/Accessory\/accessory_meal_t3_bacon_and_eggs\.png$/)

  assert.match(getBlueprintItemIconPath({
    name: 'Sweetgrass',
    classification: { type: 'Herbal Medicine', group: 'Accessories' },
    structuredData: { meta: { tier: 2 } },
  }), /\/assets\/Accessory\/accessory_herbal_medicine_t2_sweet_grass\.png$/)

  assert.match(getBlueprintItemIconPath({
    name: 'Jade Pendant',
    classification: { type: 'Amulet', group: 'Accessories' },
    structuredData: { meta: { tier: 2 } },
  }), /\/assets\/Accessory\/accessory_amulet_t2_jade_pendant\.png$/)

  assert.match(getBlueprintItemIconPath({
    name: 'Moon Powder',
    classification: { type: 'Herbal Medicine', group: 'Accessories' },
    structuredData: { meta: { tier: 3 } },
  }), /\/assets\/Accessory\/accessory_herbal_medicine_t3_moon_powder\.png$/)

  assert.match(getBlueprintItemIconPath({
    name: 'Magical Mistletoe',
    classification: { type: 'Herbal Medicine', group: 'Accessories' },
    structuredData: { meta: { tier: 3 } },
  }), /\/assets\/Accessory\/accessory_herbal_medicine_t3_magical_mistletoe\.png$/)

  assert.match(getBlueprintItemIconPath({
    name: 'Troublin',
    classification: { type: 'Familiar', group: 'Accessories' },
    structuredData: { meta: { tier: 3 } },
  }), /\/assets\/Accessory\/accessory_familiar_t3_troublin\.png$/)

  assert.match(getBlueprintItemIconPath({
    name: 'Cookie Plate',
    classification: { type: 'Dessert', group: 'Accessories' },
    structuredData: { meta: { tier: 3 } },
  }), /\/assets\/Accessory\/accessory_dessert_t3_cookie_plate\.png$/)

  assert.match(getBlueprintItemIconPath({
    name: 'Adventurer Cloak',
    classification: { type: 'Cloak', group: 'Accessories' },
    structuredData: { meta: { tier: 3 } },
  }), /\/assets\/Accessory\/accessory_cloak_t3_adventurer_cloak\.png$/)

  assert.equal(getBlueprintItemIconPath({
    classification: { type: 'Helmet', group: 'Armor' },
    iconMapping: { itemIconRelativePath: '' },
  }), '')

  assert.equal(getBlueprintItemIconPath({
    classification: { type: 'Aurasong', group: 'Accessories' },
    iconMapping: { itemIconRelativePath: '' },
  }), '')

  assert.match(getBlueprintItemIconPath({
    name: 'Scroll of Cleansing',
    classification: { type: 'Spell', group: 'Accessories' },
    structuredData: { meta: { tier: 1 } },
    iconMapping: { itemIconRelativePath: './assets/Accessory/accessory_spell_t1_nonexistent.png' },
  }), /\/assets\/Accessory\/accessory_spell_t1_scroll_of_cleansing\.png$/)

  const gauntletFallbackPath = getBlueprintItemIconPath({
    name: 'Berserker Gauntlets',
    classification: { type: 'Gauntlets', group: 'Armor' },
    structuredData: { meta: { tier: 12 } },
  })
  assert.equal(gauntletFallbackPath, '', 'assets without a tier segment in their filename are ignored')
})