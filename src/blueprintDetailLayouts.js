export const BLUEPRINT_DETAIL_LAYOUT_STORAGE_KEY = 'shopkeeper-blueprint-detail-layout'
export const BLUEPRINT_DETAIL_LAYOUT_SETTINGS_KEY = 'blueprint-detail-layout'

export const BLUEPRINT_DETAIL_SECTIONS = [
  { id: 'upgrades', label: 'Progress' },
  { id: 'inventory', label: 'Inventory & Collection' },
  { id: 'materials', label: 'Materials' },
  { id: 'stats', label: 'Specifications' },
]

const SECTION_IDS = BLUEPRINT_DETAIL_SECTIONS.map((section) => section.id)
const SECTION_ID_SET = new Set(SECTION_IDS)

export const BLUEPRINT_DETAIL_LAYOUT_PRESETS = [
  {
    id: 'overview',
    label: 'Overview',
    order: ['upgrades', 'inventory', 'materials', 'stats'],
  },
  {
    id: 'crafting',
    label: 'Crafting',
    order: ['materials', 'stats', 'upgrades', 'inventory'],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    order: ['inventory', 'upgrades', 'materials', 'stats'],
  },
  {
    id: 'custom',
    label: 'Custom',
    order: SECTION_IDS,
  },
]

const PRESET_IDS = new Set(BLUEPRINT_DETAIL_LAYOUT_PRESETS.map((preset) => preset.id))

export const DEFAULT_BLUEPRINT_DETAIL_LAYOUT = Object.freeze({
  activePreset: 'overview',
  custom: Object.freeze({
    order: Object.freeze([...SECTION_IDS]),
    hidden: Object.freeze([]),
  }),
})

function normalizeSectionIds(values = []) {
  if (!Array.isArray(values)) {
    return []
  }

  return [...new Set(values
    .map((value) => value === 'collection' ? 'inventory' : value)
    .filter((value) => SECTION_ID_SET.has(value)))]
}

function keepSpecificationsBesideMaterials(order) {
  const withoutStats = order.filter((sectionId) => sectionId !== 'stats')
  const materialsIndex = withoutStats.indexOf('materials')

  withoutStats.splice(materialsIndex + 1, 0, 'stats')
  return withoutStats
}

export function normalizeBlueprintDetailLayout(value = {}) {
  const activePreset = PRESET_IDS.has(value?.activePreset)
    ? value.activePreset
    : DEFAULT_BLUEPRINT_DETAIL_LAYOUT.activePreset
  const storedOrder = normalizeSectionIds(value?.custom?.order)
  const order = keepSpecificationsBesideMaterials([
    ...storedOrder,
    ...SECTION_IDS.filter((sectionId) => !storedOrder.includes(sectionId)),
  ])
  let hidden = normalizeSectionIds(value?.custom?.hidden)

  if (hidden.length === SECTION_IDS.length) {
    hidden = hidden.filter((sectionId) => sectionId !== order[0])
  }

  return {
    activePreset,
    custom: {
      order,
      hidden,
    },
  }
}

export function loadBlueprintDetailLayout(storage = globalThis.localStorage) {
  if (!storage || typeof storage.getItem !== 'function') {
    return normalizeBlueprintDetailLayout()
  }

  try {
    const stored = JSON.parse(storage.getItem(BLUEPRINT_DETAIL_LAYOUT_STORAGE_KEY) || '{}')
    return normalizeBlueprintDetailLayout(stored)
  } catch {
    return normalizeBlueprintDetailLayout()
  }
}

export function saveBlueprintDetailLayout(layout, storage = globalThis.localStorage) {
  const normalized = normalizeBlueprintDetailLayout(layout)

  if (storage && typeof storage.setItem === 'function') {
    storage.setItem(BLUEPRINT_DETAIL_LAYOUT_STORAGE_KEY, JSON.stringify(normalized))
  }

  return normalized
}

export function parseBlueprintDetailLayoutSetting(rawValue) {
  if (!rawValue) {
    return null
  }

  try {
    return normalizeBlueprintDetailLayout(JSON.parse(rawValue))
  } catch {
    return null
  }
}

export function getBlueprintDetailLayoutSections(layout) {
  const normalized = normalizeBlueprintDetailLayout(layout)
  const preset = BLUEPRINT_DETAIL_LAYOUT_PRESETS.find((entry) => entry.id === normalized.activePreset)

  if (normalized.activePreset !== 'custom') {
    return [...preset.order]
  }

  return normalized.custom.order.filter((sectionId) => !normalized.custom.hidden.includes(sectionId))
}

export function moveCustomLayoutSection(layout, sectionId, direction) {
  const normalized = normalizeBlueprintDetailLayout(layout)
  const currentIndex = normalized.custom.order.indexOf(sectionId)
  const nextIndex = currentIndex + (direction === 'up' ? -1 : 1)

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= normalized.custom.order.length) {
    return normalized
  }

  if (sectionId === 'materials' || sectionId === 'stats') {
    const pairStart = normalized.custom.order.indexOf('materials')
    const pairEnd = pairStart + 1

    if ((direction === 'up' && pairStart === 0) ||
        (direction !== 'up' && pairEnd === normalized.custom.order.length - 1)) {
      return normalized
    }

    const order = normalized.custom.order.filter((id) => id !== 'materials' && id !== 'stats')
    const insertionIndex = direction === 'up' ? pairStart - 1 : pairStart + 1
    order.splice(insertionIndex, 0, 'materials', 'stats')

    return normalizeBlueprintDetailLayout({
      ...normalized,
      custom: { ...normalized.custom, order },
    })
  }

  const order = [...normalized.custom.order]
  ;[order[currentIndex], order[nextIndex]] = [order[nextIndex], order[currentIndex]]

  return normalizeBlueprintDetailLayout({
    ...normalized,
    custom: { ...normalized.custom, order },
  })
}

export function setCustomLayoutSectionVisibility(layout, sectionId, isVisible) {
  const normalized = normalizeBlueprintDetailLayout(layout)
  if (!SECTION_ID_SET.has(sectionId)) {
    return normalized
  }

  const hidden = isVisible
    ? normalized.custom.hidden.filter((hiddenId) => hiddenId !== sectionId)
    : [...normalized.custom.hidden, sectionId]

  return normalizeBlueprintDetailLayout({
    ...normalized,
    custom: { ...normalized.custom, hidden },
  })
}

export function resetCustomBlueprintDetailLayout(layout) {
  return normalizeBlueprintDetailLayout({
    ...layout,
    activePreset: 'custom',
    custom: DEFAULT_BLUEPRINT_DETAIL_LAYOUT.custom,
  })
}