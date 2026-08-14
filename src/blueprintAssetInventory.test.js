import test from 'node:test'
import assert from 'node:assert/strict'
import { BLUEPRINT_ASSET_PATHS } from './blueprintAssetInventory.js'
import { BLUEPRINT_GROUP_TYPE_ORDER } from './assets/blueprintTypeOrder.js'
import { normalizeKeyPart, parseCanonicalAssetIdentity, parseCanonicalAssetLookupKey } from './iconKey.js'

const GROUP_BY_FOLDER = new Map([
  ['Weapon', 'Weapons'],
  ['Armor', 'Armor'],
  ['Accessory', 'Accessories'],
  ['Enchantment', 'Enchantments'],
])

const TYPE_KEYS_BY_GROUP = new Map(
  BLUEPRINT_GROUP_TYPE_ORDER.map(({ group, types }) => [
    group,
    new Set(types.map(normalizeKeyPart)),
  ]),
)

function getBlueprintAssetDetails(relativePath) {
  const match = String(relativePath).match(/^\.\/assets\/([^/]+)\/([^/]+)$/)
  if (!match || !GROUP_BY_FOLDER.has(match[1])) {
    return null
  }

  return {
    folder: match[1],
    fileName: match[2],
    group: GROUP_BY_FOLDER.get(match[1]),
  }
}

test('blueprint item assets follow the compact tiered convention without duplicate keys', () => {
  const keys = new Map()

  BLUEPRINT_ASSET_PATHS.forEach((relativePath) => {
    const details = getBlueprintAssetDetails(relativePath)
    if (!details || details.fileName.endsWith('_type.png') || details.fileName.endsWith('_group.png')) {
      return
    }

    const identity = parseCanonicalAssetIdentity(relativePath)
    assert.ok(identity, `Malformed blueprint item asset: ${relativePath}`)
    assert.ok(identity.tier > 0, `Blueprint item tier must be positive: ${relativePath}`)
    assert.ok(
      TYPE_KEYS_BY_GROUP.get(details.group)?.has(identity.typeSegment),
      `Unknown ${details.group} item type in ${relativePath}`,
    )

    const key = parseCanonicalAssetLookupKey(relativePath)
    assert.ok(key, `Missing canonical key for ${relativePath}`)
    assert.equal(keys.has(key), false, `Duplicate canonical key for ${keys.get(key)} and ${relativePath}`)
    keys.set(key, relativePath)
  })

  assert.ok(keys.size > 0)
})
