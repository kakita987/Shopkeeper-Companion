import test from 'node:test'
import assert from 'node:assert/strict'
import { formatCharacterTitle, getRandomTavernText } from './kofiText.js'

test('formatCharacterTitle uses a capitalized article at sentence start', () => {
  assert.equal(formatCharacterTitle('Blacksmith', 'sentence'), 'The Blacksmith')
})

test('formatCharacterTitle uses a lowercase article mid-sentence', () => {
  assert.equal(formatCharacterTitle('Blacksmith'), 'the Blacksmith')
})

test('getRandomTavernText capitalizes the article for sentence-start title phrases', () => {
  const originalRandom = Math.random
  const randomValues = [0.2, 0]
  Math.random = () => randomValues.shift() ?? 0

  try {
    const message = getRandomTavernText()
    assert.equal(message, 'The Blacksmith recommends supporting the Companion app.')
  } finally {
    Math.random = originalRandom
  }
})

test('getRandomTavernText keeps names bare when a name is chosen', () => {
  const originalRandom = Math.random
  const randomValues = [0, 0, 0.6]
  Math.random = () => randomValues.shift() ?? 0

  try {
    const message = getRandomTavernText()
    assert.equal(message, 'Argon thinks Shopkeeper deserves another coffee.')
  } finally {
    Math.random = originalRandom
  }
})
