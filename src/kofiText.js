export const DRINKS = ['coffee', 'tea', 'warm brew']

export const CHARACTERS = [
  'Argon',
  'Sia',
  'Lilu',
  'Ashley',
  'Rudo',
  'Yami',
  'Donovan',
  'Hema',
  'King Reinhold',
  'the Blacksmith',
  'the Master Tailor',
  'the Woodworker',
  'the Scholar',
  'the Herbalist',
]

export const GROUPS = [
  'the Champions',
  'the Crafters',
  'the Workers',
]

function randomItem(pool) {
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getRandomTavernText() {
  const isGroupRound = Math.random() < 0.1

  if (isGroupRound) {
    return `Buy a round for ${randomItem(GROUPS)}`
  }

  return `Buy a ${randomItem(DRINKS)} for ${randomItem(CHARACTERS)}`
}
