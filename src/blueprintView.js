import { createIcons } from 'lucide'
import { LUCIDE_ICONS, getBlueprintItemIconName, getGroupIconName, getTypeIconName } from './blueprintIcons.js'
import { cleanText, escapeHtml } from './textUtils.js'

export function renderLucideIcons(root = document) {
  createIcons({
    icons: LUCIDE_ICONS,
    root,
  })
}

export function getBlueprintVisuals(item) {
  const group = item?.classification?.group || item?.classification?.category || 'Accessories'
  const typeLabel = item?.classification?.type || item?.structuredData?.meta?.type || item?.structuredData?.meta?.category || ''

  return {
    group,
    type: typeLabel,
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
  const renderStageSelect = ({ label = '', stageKey = '', entries = [] }) => {
    const stageValue = getBlueprintStageValue(progress, stageKey)
    const options = getBlueprintStageOptions(stageKey, progress, entries)

    return `
      <label class="upgrade-stage-control">
        <span class="sr-only">${escapeMarkup(label)} status</span>
        <select class="upgrade-stage-select" data-stage-key="${escapeMarkup(stageKey)}" data-blueprint-name="${escapeMarkup(blueprintName)}" ${owned ? '' : 'disabled'}>
          ${options.map((option) => `<option value="${option.value}" ${stageValue === option.value ? 'selected' : ''}>${escapeMarkup(option.label)}</option>`).join('')}
        </select>
      </label>
    `
  }

  const markup = []

  const milestoneEntries = Array.isArray(upgrades.crafting) ? upgrades.crafting : []
  const starforgeEntries = Array.isArray(upgrades.starforged) ? upgrades.starforged : []
  if (milestoneEntries.length || starforgeEntries.length) {
    const milestoneValue = getBlueprintStageValue(progress, 'milestones')
    const starforgeValue = getBlueprintStageValue(progress, 'starforge')
    const starforgeUnlocked = Boolean(progress?.starforgeUnlocked)
    const milestoneOptions = getBlueprintStageOptions('milestones', progress, milestoneEntries)
    const starforgeOptions = getBlueprintStageOptions(
      'starforge',
      { ...progress, starforgeUnlocked: true },
      starforgeEntries,
    )
    const milestoneStageCount = Math.max(...milestoneOptions.map((option) => Number(option.value) || 0), 0)

    const combinedOptions = []
    milestoneOptions.forEach((option) => {
      const numericValue = Number(option.value) || 0
      const stageLabel = numericValue > 0 ? `${numericValue}. ` : ''
      combinedOptions.push({
        value: `milestones:${option.value}`,
        label: `${stageLabel}Milestones · ${option.label}`,
        disabled: false,
      })
    })

    starforgeOptions
      .filter((option) => Number(option.value) > 0)
      .forEach((option, index) => {
        const stageNumber = milestoneStageCount + index + 1
        combinedOptions.push({
          value: `starforge:${option.value}`,
          label: `${stageNumber}. Starforge · ${option.label}${starforgeUnlocked ? '' : ' (Locked)'}`,
          disabled: !starforgeUnlocked,
        })
      })

    const selectedValue = starforgeValue > 0
      ? `starforge:${starforgeValue}`
      : `milestones:${milestoneValue}`
    const resolvedSelectedValue = combinedOptions.some((option) => option.value === selectedValue)
      ? selectedValue
      : combinedOptions[0]?.value

    markup.push(`
      <div class="upgrade-group ${owned ? '' : 'is-locked'}">
        <div class="upgrade-group-top upgrade-group-top--milestones">
          <h5>Milestones</h5>
          <label class="tracking-label upgrade-unlock-toggle">
            <span>Starforge</span>
            <input class="tracking-checkbox starforge-unlock-checkbox" type="checkbox" data-starforge-unlock="true" ${starforgeUnlocked ? 'checked' : ''} ${owned ? '' : 'disabled'} />
          </label>
        </div>
        <label class="upgrade-stage-control upgrade-stage-control--wide">
          <span class="sr-only">Milestones and Starforge status</span>
          <select class="upgrade-stage-select" data-stage-key="milestones-starforge" data-blueprint-name="${escapeMarkup(blueprintName)}" ${owned ? '' : 'disabled'}>
            ${combinedOptions.map((option) => `<option value="${option.value}" ${resolvedSelectedValue === option.value ? 'selected' : ''} ${option.disabled ? 'disabled' : ''}>${escapeMarkup(option.label)}</option>`).join('')}
          </select>
        </label>
        ${starforgeUnlocked ? '' : '<p class="upgrade-lock-note">Unlock the Starforge key to progress Starforge upgrades (milestone tree stages 6+).</p>'}
      </div>
    `)
  }

  const ascensionEntries = Array.isArray(upgrades.ascension) ? upgrades.ascension : []
  const transcendenceEntries = Array.isArray(upgrades.transcendence) ? upgrades.transcendence : []
  if (ascensionEntries.length || transcendenceEntries.length) {
    const ascensionValue = getBlueprintStageValue(progress, 'ascension')
    const transcendenceValue = getBlueprintStageValue(progress, 'transcendence')
    const ascensionOptions = getBlueprintStageOptions('ascension', progress, ascensionEntries)
    const transcendenceOptions = getBlueprintStageOptions('transcendence', progress, transcendenceEntries)
    const ascensionStageCount = Math.max(...ascensionOptions.map((option) => Number(option.value) || 0), 0)

    const combinedOptions = []
    ascensionOptions.forEach((option) => {
      const numericValue = Number(option.value) || 0
      const stageLabel = numericValue > 0 ? `${numericValue}. ` : ''
      combinedOptions.push({
        value: `ascension:${option.value}`,
        label: `${stageLabel}Improve · ${option.label}`,
      })
    })

    transcendenceOptions
      .filter((option) => Number(option.value) > 0)
      .forEach((option, index) => {
        const stageNumber = ascensionStageCount + index + 1
        combinedOptions.push({
          value: `transcendence:${option.value}`,
          label: `${stageNumber}. Transcendence · ${option.label}`,
        })
      })

    const selectedValue = transcendenceValue > 0
      ? `transcendence:${transcendenceValue}`
      : `ascension:${ascensionValue}`
    const resolvedSelectedValue = combinedOptions.some((option) => option.value === selectedValue)
      ? selectedValue
      : combinedOptions[0]?.value

    markup.push(`
      <div class="upgrade-group ${owned ? '' : 'is-locked'}">
        <div class="upgrade-group-top">
          <h5>Improve</h5>
          <label class="upgrade-stage-control">
            <span class="sr-only">Improve and Transcendence status</span>
            <select class="upgrade-stage-select" data-stage-key="ascension-transcendence" data-blueprint-name="${escapeMarkup(blueprintName)}" ${owned ? '' : 'disabled'}>
              ${combinedOptions.map((option) => `<option value="${option.value}" ${resolvedSelectedValue === option.value ? 'selected' : ''}>${escapeMarkup(option.label)}</option>`).join('')}
            </select>
          </label>
        </div>
      </div>
    `)
  }

  if (!markup.length) {
    return '<p class="empty-state">No upgrade milestones listed.</p>'
  }

  return `<div class="upgrade-groups-grid">${markup.join('')}</div>`
}

export function renderInventorySection(progress = {}, { qualityLabels = ['Normal', 'Superior', 'Flawless', 'Epic', 'Legendary'], getQualityClass, escapeHtml: escapeMarkup } = {}) {
  return qualityLabels.map((label) => {
    const key = label.toLowerCase()
    const value = progress.inventory?.[key] ?? 0
    const qualityClass = getQualityClass(label)
    return `
      <label class="inventory-field inventory-color-only ${qualityClass}" title="${escapeMarkup(label)}">
        <span class="inventory-quality-label">${escapeMarkup(label)}</span>
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
            <span class="inventory-quality-label">${escapeMarkup(label)}</span>
            <input class="collection-input" aria-label="${escapeMarkup(label)} collection status" type="checkbox" data-quality-key="${escapeMarkup(key)}" ${collectionValues[key] ? 'checked' : ''} ${isOwned ? '' : 'disabled'} />
          </label>
        `
      }).join('')}
    </div>
  `
}

export function buildDependencySummaryLine(summary = {}) {
  const parts = []

  if (summary.isDependentOn) {
    parts.push('Dependent')
  }

  if (summary.isNeededFor) {
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
  const blueprintNames = dependencyIndex?.blueprintNames instanceof Set ? dependencyIndex.blueprintNames : new Set()
  const isDependentOn = components.some((component) => blueprintNames.has(cleanText(component?.name).toLowerCase()))

  return {
    isOwned: Boolean(progress.owned),
    isMastered,
    isDependentOn,
    isNeededFor: dependentNames.length > 0,
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

function buildBlueprintGroups(items = [], groupDefinitions = []) {
  const groupMaps = groupDefinitions.map((definition) => ({
    title: definition.group,
    typeOrder: definition.types.map((type) => type.toLowerCase()),
    typeGroups: new Map(),
  }))

  items.forEach((item) => {
    const itemGroup = item?.classification?.group || item?.classification?.category
    const group = groupMaps.find((entry) => entry.title === itemGroup)

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

  return groupMaps.map((group) => {
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
  groupDefinitions = [],
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

  const groups = buildBlueprintGroups(items, groupDefinitions)
  const container = document.createElement('div')
  container.className = 'blueprint-groups'

  groups.forEach((group) => {
    const details = document.createElement('details')
    details.className = 'blueprint-category'
    const groupDrawerKey = `group::${group.title}`
    details.dataset.drawerKey = groupDrawerKey
    details.open = openDrawerKeys.has(groupDrawerKey)

    const summary = document.createElement('summary')
    summary.innerHTML = `
      <span class="group-summary-title">
        <span class="icon-slot group-summary-icon" aria-hidden="true"><i data-lucide="${escapeHtml(getGroupIconName(group.title))}"></i></span>
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