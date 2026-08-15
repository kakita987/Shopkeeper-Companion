import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeKeyPart,
  parseCanonicalAssetIdentity,
  parseCanonicalAssetLookupKey,
} from './iconKey.js'

test('normalizes diacritics generically', () => {
  assert.equal(normalizeKeyPart('Crème brûlée'), 'cremebrulee')
})

test('parses compact item assets using the parent group folder', () => {
  assert.deepEqual(
    parseCanonicalAssetIdentity('./assets/Accessory/herbal_medicine_t2_sweet_grass.png'),
    {
      groupSegment: 'accessory',
      typeSegment: 'herbalmedicine',
      tier: 2,
      normalizedName: 'sweetgrass',
    },
  )

  assert.equal(
    parseCanonicalAssetLookupKey('./assets/Weapon/scythe_t16_esper_intemporal.png'),
    'weapon::scythe::16::esperintemporal',
  )
})

test('keeps hyphens meaningful while normalizing canonical item names', () => {
  assert.equal(
    parseCanonicalAssetLookupKey('./assets/Enchantment/spirit_t16_tomb-bound_spirit.png'),
    'enchantment::spirit::16::tombboundspirit',
  )
})

test('rejects old, untiered, and non-blueprint asset paths', () => {
  assert.equal(parseCanonicalAssetIdentity('./assets/Armor/armor_mask_t6_autumnal_mask.png'), null)
  assert.equal(parseCanonicalAssetIdentity('./assets/Enchantment/spirit_bear.png'), null)
  assert.equal(parseCanonicalAssetIdentity('./assets/Backgrounds/event_t1_image.png'), null)
})