import { cleanText } from './textUtils.js'

export const SAVED_FILTER_VIEWS_STORAGE_KEY = 'shopkeeper-saved-filter-views'

export const DEFAULT_SAVED_VIEW_CRITERIA = {
  dependency: 'any',
  ownership: 'any',
  inventory: 'any',
  mastered: 'any',
  collectionBookState: 'completed',
  collectionBook: [],
}

export const STARTER_VIEW_PRESETS = [
  {
    id: 'dependent-on',
    label: 'Dependent',
    criteria: {
      ...DEFAULT_SAVED_VIEW_CRITERIA,
      dependency: 'dependent',
    },
  },
  {
    id: 'needed-for',
    label: 'Needed',
    criteria: {
      ...DEFAULT_SAVED_VIEW_CRITERIA,
      dependency: 'needed',
    },
  },
]

export function normalizeSavedViewCriteria(criteria = {}) {
  const collectionBook = Array.isArray(criteria.collectionBook)
    ? criteria.collectionBook
    : typeof criteria.collection === 'string' && criteria.collection !== 'any'
      ? [criteria.collection]
      : []

  const dependency = cleanText(criteria.dependency).toLowerCase()

  return {
    dependency: ['any', 'dependent', 'needed'].includes(dependency)
      ? dependency
      : 'any',
    ownership: ['owned', 'not-owned', 'any'].includes(criteria.ownership) ? criteria.ownership : 'any',
    inventory: ['any', 'has', 'superior-or-better'].includes(criteria.inventory) ? criteria.inventory : 'any',
    mastered: ['any', 'mastered', 'not-mastered'].includes(criteria.mastered) ? criteria.mastered : 'any',
    collectionBookState: ['completed', 'needed'].includes(criteria.collectionBookState) ? criteria.collectionBookState : 'completed',
    collectionBook: collectionBook.filter((value) => ['superior', 'flawless', 'epic', 'legendary'].includes(String(value).toLowerCase())),
  }
}

export function hasActiveSavedViewFilters(criteria = {}) {
  const normalizedCriteria = normalizeSavedViewCriteria(criteria)
  return normalizedCriteria.dependency !== 'any'
    || normalizedCriteria.ownership !== 'any'
    || normalizedCriteria.inventory !== 'any'
    || normalizedCriteria.mastered !== 'any'
    || normalizedCriteria.collectionBook.length > 0
}

export function getCollectionBookMatchDescription(state = 'completed') {
  return state === 'needed'
    ? 'Still Needed checks missing qualities.'
    : 'Completed checks finished qualities.'
}

export function parseSavedViewsRows(rows = []) {
  return rows
    .map((row) => {
      const id = cleanText(row?.[0])
      const name = cleanText(row?.[1])

      if (!id || !name) {
        return null
      }

      return {
        id,
        name,
        criteria: normalizeSavedViewCriteria({
          dependency: cleanText(row?.[2]) || 'any',
          ownership: cleanText(row?.[3]) || 'any',
          inventory: cleanText(row?.[4]) || 'any',
          mastered: cleanText(row?.[5]) || 'any',
          collectionBook: (() => {
            const raw = cleanText(row?.[6])
            if (!raw) {
              return []
            }

            try {
              const parsed = JSON.parse(raw)
              return Array.isArray(parsed) ? parsed : []
            } catch {
              return raw.split(',').map((entry) => cleanText(entry.toLowerCase())).filter(Boolean)
            }
          })(),
        }),
      }
    })
    .filter(Boolean)
}

export function buildSavedViewsRows(savedFilterViews = []) {
  return savedFilterViews
    .map((view) => {
      const id = cleanText(view?.id)
      const name = cleanText(view?.name)
      if (!id || !name) {
        return null
      }

      const criteria = normalizeSavedViewCriteria(view?.criteria || {})

      return [
        id,
        name,
        criteria.dependency || 'any',
        criteria.ownership || 'any',
        criteria.inventory || 'any',
        criteria.mastered || 'any',
        JSON.stringify(criteria.collectionBook || []),
      ]
    })
    .filter(Boolean)
}

export function loadSavedFilterViews(storage = globalThis.localStorage) {
  if (!storage || typeof storage.getItem !== 'function') {
    return []
  }

  try {
    const stored = JSON.parse(storage.getItem(SAVED_FILTER_VIEWS_STORAGE_KEY) || '[]')
    if (!Array.isArray(stored)) {
      return []
    }

    return stored
      .map((entry) => {
        const id = cleanText(entry?.id)
        const name = cleanText(entry?.name)
        if (!id || !name) {
          return null
        }

        return {
          id,
          name,
          criteria: normalizeSavedViewCriteria(entry.criteria || {}),
        }
      })
      .filter(Boolean)
  } catch (error) {
    console.warn('Unable to load saved filter views.', error)
    return []
  }
}