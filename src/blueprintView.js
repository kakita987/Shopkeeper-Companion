import { createIcons } from 'lucide'
import { LUCIDE_ICONS, getBlueprintItemIconName, getCategoryIconName, getTypeIconName } from './blueprintIcons.js'
import { cleanText, escapeHtml } from './textUtils.js'

const BLUEPRINT_TYPE_ORDER = {
  Weapons: ['Sword', 'Axe', 'Dagger', 'Mace', 'Spear', 'Bow', 'Wand', 'Staff', 'Gun', 'Crossbow', 'Instrument', 'Dual Wield', 'Catalyst'],
  Armor: ['Heavy Armor', 'Light Armor', 'Clothes', 'Helmet', 'Rogue Hat', 'Magician Hat', 'Gauntlets', 'Gloves', 'Heavy Footwear', 'Light Footwear'],
  Accessories: ['Herbal Remedy', 'Potion', 'Spell', 'Shield', 'Cloak', 'Ring', 'Amulet', 'Familiar', 'Aurasong', 'Quiver', 'Idol', 'Meal', 'Dessert'],
  Enchantments: ['Element', 'Spirit'],
}

export function renderLucideIcons(root = document) {
  createIcons({
    icons: LUCIDE_ICONS,
    root,
  })
}

export function getBlueprintVisuals(item) {
  const category = item?.classification?.category || 'Accessories'
  const type = item?.classification?.type || item?.structuredData?.meta?.type || ''

  return {
    category,
    type,
  }
}

export function renderOverlaySectionCard(title, bodyMarkup, { hint = '', headerExtra = '', isOpen = true, cardClass = '' } = {}) {
  const hintMarkup = hint ? `<span class="section-hint">${escapeHtml(hint)}</span>` : ''
  const cardClassName = cardClass ? ` ${escapeHtml(cardClass)}` : ''

  return `
    <div class="overlay-card${cardClassName}">
      <details class="overlay-section" ${isOpen ? 'open' : ''}>
        <summary class="section-summary">
          <div class="section-summary-title">
            <h4>${escapeHtml(title)}</h4>
          </div>
          ${headerExtra}
          ${hintMarkup}
        </summary>
        <div class="section-body">
          ${bodyMarkup}
        </div>
      </details>
    </div>
  `
}

export function renderStatsCards(stats = {}, { formatStatLabel, formatValue } = {}) {
  const entries = Object.entries(stats || {})

  if (!entries.length) {
    return '<p class="empty-state">No stats listed for this blueprint.</p>'
  }

  return entries.map(([key, value]) => `
    <div class="info-pill">
      <span>${escapeHtml(formatStatLabel(key))}</span>
      <strong>${escapeHtml(formatValue(value))}</strong>
    </div>
  `).join('')
}

export function renderMaterialsSection(materials = {}, { formatMaterialLabel, formatValue } = {}) {
  const resources = Object.entries(materials.resources || {})
  const components = Array.isArray(materials.components) ? materials.components : []

  const resourceMarkup = resources.length
    ? `
      <div class="material-column">
        <h5>Resources</h5>
        <ul class="material-list">
          ${resources.map(([key, value]) => `
            <li class="resource-item">
              <span>${escapeHtml(formatMaterialLabel(key))}</span>
              <strong>${escapeHtml(formatValue(value))}</strong>
            </li>
          `).join('')}
        </ul>
      </div>
    `
    : ''

  const componentMarkup = components.length
    ? `
      <div class="material-column">
        <h5>Components</h5>
        <ul class="material-list">
          ${components.map((component) => `
            <li class="resource-item">
              <span>${escapeHtml(component.name || 'Component')}</span>
              <strong>${escapeHtml(component.count ? `${component.count}x` : '')}${component.quality ? ` · ${component.quality}` : ''}</strong>
            </li>
          `).join('')}
        </ul>
      </div>
    `
    : ''

  if (!resourceMarkup && !componentMarkup) {
    return '<p class="empty-state">No material requirements listed.</p>'
  }

  return `${resourceMarkup}${componentMarkup}`
}

export function renderUpgradeSection(upgrades = {}, blueprintName = '', progress = {}, owned = false, { getBlueprintStageValue, getBlueprintStageOptions, escapeHtml: escapeMarkup } = {}) {
  const groups = [
    { key: 'crafting', stageKey: 'milestones', label: 'Milestones' },
    { key: 'starforged', stageKey: 'starforge', label: 'Starforge' },
    { key: 'ascension', stageKey: 'ascension', label: 'Ascension' },
    { key: 'transcendence', stageKey: 'transcendence', label: 'Transcendence' },
  ]

  const markup = groups.map(({ key, stageKey, label }) => {
    const entries = Array.isArray(upgrades[key]) ? upgrades[key] : []

    if (!entries.length) {
      return ''
    }

    const stageValue = getBlueprintStageValue(progress, stageKey)
    const options = getBlueprintStageOptions(stageKey, progress, entries)

    return `
      <div class="upgrade-group ${owned ? '' : 'is-locked'}">
        <div class="upgrade-group-top">
          <h5>${escapeMarkup(label)}</h5>
          <label class="upgrade-stage-control">
            <span class="sr-only">${escapeMarkup(label)} status</span>
            <select class="upgrade-stage-select" data-stage-key="${escapeMarkup(stageKey)}" data-blueprint-name="${escapeMarkup(blueprintName)}" ${owned ? '' : 'disabled'}>
              ${options.map((option) => `<option value="${option.value}" ${stageValue === option.value ? 'selected' : ''}>${escapeMarkup(option.label)}</option>`).join('')}
            </select>
          </label>
        </div>
      </div>
    `
  }).filter(Boolean).join('')

  return `<div class="upgrade-groups-grid">${markup}</div>` || '<p class="empty-state">No upgrade milestones listed.</p>'
}

export function renderInventorySection(progress = {}, { qualityLabels = ['Normal', 'Superior', 'Flawless', 'Epic', 'Legendary'], getQualityClass, escapeHtml: escapeMarkup } = {}) {
  return qualityLabels.map((label) => {
    const key = label.toLowerCase()
    const value = progress.inventory?.[key] ?? 0
    const qualityClass = getQualityClass(label)
    return `
      <label class="inventory-field inventory-color-only ${qualityClass}" title="${escapeMarkup(label)}">
        <input class="quality-input" aria-label="${escapeMarkup(label)} quality inventory" type="number" min="0" step="1" value="${value}" data-quality-key="${escapeMarkup(key)}" />
      </label>
    `
  }).join('')
}

export function renderCollectionSection(progress = {}, isOwned = false, { getQualityClass, escapeHtml: escapeMarkup } = {}) {
  const qualities = ['superior', 'flawless', 'epic', 'legendary']
  const collectionValues = progress.collectionBook || {}

  return `
    <div class="collection-notice">${isOwned ? 'Checked = complete in your collection book.' : 'Set Owned to enable this section.'}</div>
    <div class="inventory-grid">
      ${qualities.map((key) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1)
        const qualityClass = getQualityClass(label)
        return `
          <label class="inventory-field collection-toggle-field ${qualityClass}" title="${escapeMarkup(label)}">
            <input class="collection-input" aria-label="${escapeMarkup(label)} collection status" type="checkbox" data-quality-key="${escapeMarkup(key)}" ${collectionValues[key] ? 'checked' : ''} ${isOwned ? '' : 'disabled'} />
          </label>
        `
      }).join('')}
    </div>
  `
}

export function buildDependencySummaryLine(summary = {}) {
  const parts = []

  if (summary.isParentDependency) {
    parts.push('Dependent')
  }

  if (summary.isChildDependency) {
    const dependentCount = summary.dependentNames?.length || 0
    parts.push(`Needed (${dependentCount})`)
  }

  if (!parts.length) {
    return 'No dependency relation'
  }

  return parts.join(' · ')
}

export function buildBlueprintSummary(item, dependencyIndex, { getBlueprintProgressState, calculateTotalInventory, getCollectionBookStatus, getBlueprintMilestoneKeys, isTrackedUpgrade, getBlueprintMaterials } = {}) {
  const progress = getBlueprintProgressState(item.name)
  const craftingMilestones = Array.isArray(item?.structuredData?.upgrades?.crafting) ? item.structuredData.upgrades.crafting : []
  const materials = getBlueprintMaterials(item)
  const blueprintState = {
    own: Boolean(progress.owned),
    master: Boolean(progress.master),
    inventory: progress.inventory || {},
    collectionBook: progress.collectionBook || {},
    materials,
  }

  const normalizedName = cleanText(item.name).toLowerCase()
  const dependentSet = dependencyIndex?.dependentsByComponent?.get(normalizedName)
  const dependentNames = dependentSet ? [...dependentSet] : []
  const totalInventory = calculateTotalInventory(blueprintState)
  const collectionStatus = getCollectionBookStatus(blueprintState)
  const isMastered = Boolean(progress.owned) && craftingMilestones.length >= 5 && getBlueprintMilestoneKeys(item.name, craftingMilestones.slice(0, 5)).every((key) => isTrackedUpgrade(key))
  const collectionBookQualities = Object.entries(progress.collectionBook || {})
    .filter(([, checked]) => Boolean(checked))
    .map(([quality]) => quality)
  const allCollectionQualities = ['superior', 'flawless', 'epic', 'legendary']
  const collectionBookNeededQualities = allCollectionQualities.filter((quality) => !collectionBookQualities.includes(quality))

  const hasSuperiorOrBetterInventory = ['superior', 'flawless', 'epic', 'legendary'].some((qualityKey) => Number(blueprintState.inventory?.[qualityKey] || 0) > 0)
  const components = Array.isArray(materials.components) ? materials.components : []

  return {
    isOwned: Boolean(progress.owned),
    isMastered,
    isParentDependency: components.some((component) => Boolean(cleanText(component?.name))),
    isChildDependency: dependentNames.length > 0,
    dependentNames,
    hasInventory: totalInventory > 0,
    hasSuperiorOrBetterInventory,
    totalInventory,
    isCollectionComplete: collectionStatus === '✅ Complete',
    collectionStatus,
    collectionBookQualities,
    collectionBookNeededQualities,
  }
}

export function buildBlueprintGroups(items = [], categoryDefinitions = []) {
  const categoryMaps = categoryDefinitions.map((definition) => ({
    title: definition.title,
    typeOrder: definition.types.map((type) => type.toLowerCase()),
    typeGroups: new Map(),
  }))

  items.forEach((item) => {
    const group = categoryMaps.find((entry) => entry.title === item.classification.category)

    if (!group) {
      return
    }

    const normalizedType = item.classification.type || 'Unknown'
    const typeKey = normalizedType.toLowerCase()
    let typeGroup = group.typeGroups.get(typeKey)

    if (!typeGroup) {
      typeGroup = {
        title: normalizedType,
        items: [],
      }
      group.typeGroups.set(typeKey, typeGroup)
    }

    typeGroup.items.push(item)
  })

  return categoryMaps.map((group) => {
    const orderedTypes = []

    group.typeOrder.forEach((typeKey) => {
      const matchingGroup = group.typeGroups.get(typeKey)
      if (matchingGroup) {
        orderedTypes.push(matchingGroup)
      }
    })

    group.typeGroups.forEach((typeGroup, typeKey) => {
      if (!orderedTypes.some((entry) => entry.title.toLowerCase() === typeKey)) {
        orderedTypes.push(typeGroup)
      }
    })

    return {
      title: group.title,
      totalItems: orderedTypes.reduce((count, typeGroup) => count + typeGroup.items.length, 0),
      types: orderedTypes,
    }
  }).filter((group) => group.totalItems > 0)
}

export function renderPreview(items = [], {
  previewEl,
  blueprintOverlay,
  categoryDefinitions = [],
  onOpenBlueprintOverlay,
  onCloseBlueprintOverlay,
  renderLucideIcons: renderIcons = renderLucideIcons,
} = {}) {
  if (!previewEl) {
    return
  }

  const openDrawerKeys = new Set(
    Array.from(previewEl.querySelectorAll('details[data-drawer-key][open]')).map((node) => node.dataset.drawerKey)
  )

  previewEl.innerHTML = ''

  if (!Array.isArray(items) || !items.length) {
    previewEl.innerHTML = '<p class="empty-state">No rows were returned from the sheet.</p>'
    return
  }

  const groups = buildBlueprintGroups(items, categoryDefinitions)
  const container = document.createElement('div')
  container.className = 'blueprint-groups'

  groups.forEach((group) => {
    const details = document.createElement('details')
    details.className = 'blueprint-category'
    const categoryDrawerKey = `category::${group.title}`
    details.dataset.drawerKey = categoryDrawerKey
    details.open = openDrawerKeys.has(categoryDrawerKey)

    const summary = document.createElement('summary')
    summary.innerHTML = `
      <span class="group-summary-title">
        <span class="icon-slot group-summary-icon" aria-hidden="true"><i data-lucide="${escapeHtml(getCategoryIconName(group.title))}"></i></span>
        <span>${escapeHtml(group.title)}</span>
      </span>
      <span class="group-count">${group.totalItems}</span>
    `
    details.appendChild(summary)

    const body = document.createElement('div')
    body.className = 'category-body'

    group.types.forEach((typeGroup) => {
      if (!typeGroup.items.length) {
        return
      }

      const subDetails = document.createElement('details')
      subDetails.className = 'blueprint-type'
      const typeDrawerKey = `type::${group.title}::${typeGroup.title}`
      subDetails.dataset.drawerKey = typeDrawerKey
      subDetails.open = openDrawerKeys.has(typeDrawerKey)

      const subSummary = document.createElement('summary')
      subSummary.innerHTML = `
        <span class="group-summary-title">
          <span class="icon-slot group-summary-icon" aria-hidden="true"><i data-lucide="${escapeHtml(getTypeIconName(typeGroup.title, group.title))}"></i></span>
          <span>${escapeHtml(typeGroup.title)}</span>
        </span>
        <span class="group-count">${typeGroup.items.length}</span>
      `
      subDetails.appendChild(subSummary)

      const list = document.createElement('ul')
      list.className = 'blueprint-items'

      typeGroup.items.forEach((item) => {
        const listItem = document.createElement('li')
        listItem.className = 'blueprint-item'
        const tierText = item.structuredData?.meta?.tier ? String(item.structuredData.meta.tier) : '—'
        listItem.innerHTML = `
          <div class="item-copy">
            <div class="item-title-row">
              <span class="icon-slot item-card-icon" aria-hidden="true"><i data-lucide="${escapeHtml(getBlueprintItemIconName(item))}"></i></span>
              <span class="item-name">${escapeHtml(item.name)}</span>
              <span class="item-tier-badge">${escapeHtml(tierText)}</span>
            </div>
          </div>
        `
        listItem.addEventListener('click', () => onOpenBlueprintOverlay?.(item))
        list.appendChild(listItem)
      })

      subDetails.appendChild(list)
      body.appendChild(subDetails)
    })

    details.appendChild(body)
    container.appendChild(details)
  })

  const groupNodes = Array.from(container.querySelectorAll('.blueprint-category'))
  const categoryNodes = Array.from(container.querySelectorAll('.blueprint-type'))

  groupNodes.forEach((node) => {
    node.addEventListener('toggle', () => {
      if (!node.open) {
        return
      }

      groupNodes.forEach((otherNode) => {
        if (otherNode !== node) {
          otherNode.open = false
        }
      })

      categoryNodes.forEach((categoryNode) => {
        categoryNode.open = false
      })
    })
  })

  categoryNodes.forEach((node) => {
    node.addEventListener('toggle', () => {
      if (!node.open) {
        return
      }

      categoryNodes.forEach((otherNode) => {
        if (otherNode !== node) {
          otherNode.open = false
        }
      })
    })
  })

  blueprintOverlay?.querySelectorAll('[data-close-overlay="true"]').forEach((node) => {
    node.addEventListener('click', onCloseBlueprintOverlay)
  })

  previewEl.appendChild(container)
  renderIcons(container)
}