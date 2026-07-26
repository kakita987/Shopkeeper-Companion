import './style.css'
import { useGoogleAuth } from './useGoogleAuth.js'
import { createIcons, Axe, BadgeAlert, BadgeHelp, BadgeInfo, BowArrow, CakeSlice, Candy, CandyCane, CircleDashed, Clover, Coffee, Crosshair, Diamond, Drumstick, FlaskConical, FlaskRound, Footprints, Gem, Hand, HandMetal, HardHat, HatGlasses, Leaf, MoonStar, Music2, Package, PackageOpen, PartyPopper, PillBottle, Pizza, Salad, ScrollText, Shield, Shirt, Sandwich, Sparkles, Swords, Sword, Target, UtensilsCrossed, Wand, WandSparkles, Apple, Fish, SunMedium, Cherry, Cookie } from 'lucide'

const DEFAULT_SPREADSHEET_URL = 'https://playshoptitans.com/spreadsheet'

const CATEGORY_DEFINITIONS = [
  {
    title: 'Weapons',
    types: ['Sword', 'Axe', 'Dagger', 'Mace', 'Spear', 'Bow', 'Wand', 'Staff', 'Gun', 'Crossbow', 'Instrument', 'Dual Wield', 'Catalyst'],
  },
  {
    title: 'Armor',
    types: ['Heavy Armor', 'Light Armor', 'Clothes', 'Helmet', 'Rogue Hat', 'Magician Hat', 'Gauntlets', 'Gloves', 'Heavy Footwear', 'Light Footwear'],
  },
  {
    title: 'Accessories',
    types: ['Herbal Remedy', 'Potion', 'Spell', 'Shield', 'Cloak', 'Ring', 'Amulet', 'Familiar', 'Aurasong', 'Quiver', 'Idol', 'Meal', 'Dessert'],
  },
  {
    title: 'Enchantments',
    types: ['Element', 'Spirit'],
  },
]

const CATEGORY_TYPE_LOOKUP = new Map(
  CATEGORY_DEFINITIONS.flatMap((definition) => definition.types.map((type) => [normalizeTypeKey(type), { category: definition.title, type }]))
)

const app = document.querySelector('#app')
const RESOURCE_LABELS = ['Iron', 'Wood', 'Steel', 'Leather', 'Herbs', 'Oils', 'Fabric', 'Gems', 'Mana', 'Essence']
const QUALITY_LABELS = ['Normal', 'Superior', 'Flawless', 'Epic', 'Legendary']
const INVENTORY_QUALITY_KEYS = ['normal', 'superior', 'flawless', 'epic', 'legendary']
const COLLECTION_BOOK_QUALITY_ORDER = ['legendary', 'epic', 'flawless', 'superior']
const DEFAULT_SAVED_VIEW_CRITERIA = {
  dependency: 'any',
  ownership: 'any',
  inventory: 'any',
  collection: 'any',
}
const STARTER_VIEW_PRESETS = [
  {
    id: 'parent-dependencies',
    label: 'Dependent',
    criteria: {
      ...DEFAULT_SAVED_VIEW_CRITERIA,
      dependency: 'parent',
    },
  },
  {
    id: 'child-dependencies',
    label: 'Needed',
    criteria: {
      ...DEFAULT_SAVED_VIEW_CRITERIA,
      dependency: 'child',
    },
  },
]
const TRACKED_UPGRADES_STORAGE_KEY = 'shopkeeper-tracked-upgrades'
const BLUEPRINT_PROGRESS_STORAGE_KEY = 'shopkeeper-blueprint-progress'
const SAVED_FILTER_VIEWS_STORAGE_KEY = 'shopkeeper-saved-filter-views'
const FONT_PREFERENCE_STORAGE_KEY = 'shopkeeper-font-preference'

const LUCIDE_ICONS = {
  Axe,
  BadgeAlert,
  BadgeHelp,
  BadgeInfo,
  BowArrow,
  CakeSlice,
  Candy,
  CandyCane,
  CircleDashed,
  Clover,
  Coffee,
  Crosshair,
  Diamond,
  Drumstick,
  FlaskConical,
  FlaskRound,
  Footprints,
  Gem,
  Hand,
  HandMetal,
  HardHat,
  HatGlasses,
  Leaf,
  MoonStar,
  Music2,
  Package,
  PackageOpen,
  PartyPopper,
  PillBottle,
  Pizza,
  Salad,
  ScrollText,
  Shield,
  Shirt,
  Sandwich,
  Sparkles,
  Swords,
  Sword,
  Target,
  UtensilsCrossed,
  Wand,
  WandSparkles,
  Apple,
  Fish,
  SunMedium,
  Cherry,
  Cookie,
}

app.innerHTML = `
  <main class="importer-shell">
    <header class="app-header">
      <div class="hero-copy">
        <h1>Shopkeeper Companion</h1>
      </div>

      <nav class="top-tabs" aria-label="Primary">
        <button class="top-tab is-active" type="button" data-view="blueprints">Blueprints</button>
        <button class="top-tab" type="button" data-view="saved-views">Saved Views</button>
      </nav>

      <button id="settings-toggle" class="settings-toggle" type="button" aria-label="Open settings" aria-expanded="false" aria-controls="settings-panel">⚙</button>
    </header>

    <div class="view-shell">
      <section class="panel preview-panel" data-view-panel="blueprints">
        <div class="preview-header">
          <div>
            <p id="status" class="status"></p>
          </div>
        </div>
        <div id="preview" class="preview"></div>
      </section>

      <section class="panel preview-panel is-hidden" data-view-panel="saved-views">
        <div id="saved-views-content" class="saved-views-content"></div>
      </section>
    </div>

    <div id="blueprint-overlay" class="blueprint-overlay" aria-hidden="true">
      <div class="blueprint-overlay-backdrop" data-close-overlay="true"></div>
      <div class="blueprint-overlay-panel" role="dialog" aria-modal="true" aria-labelledby="blueprint-overlay-title">
        <button class="overlay-close" type="button" aria-label="Close blueprint details" data-close-overlay="true">×</button>
        <div id="blueprint-overlay-content" class="blueprint-overlay-content"></div>
      </div>
    </div>

    <aside id="settings-panel" class="settings-panel" aria-hidden="true">
      <div class="settings-card">
        <div class="settings-header">
          <h2 class="settings-title">Settings</h2>
          <button id="close-settings" class="close-settings" type="button" aria-label="Close settings">×</button>
        </div>

        <section class="settings-section">
          <h3>Theme</h3>
          <div class="theme-options">
            <label><input type="radio" name="theme" value="light" /> Light</label>
            <label><input type="radio" name="theme" value="dark" /> Dark</label>
            <label><input type="radio" name="theme" value="device" checked /> Device</label>
          </div>
        </section>

        <section class="settings-section">
          <h3>Font</h3>
          <select id="font-select" class="font-select" aria-label="Font style">
            <option value="default">Aesthetic (Default)</option>
            <option value="sans">Century Gothic</option>
            <option value="serif">Times New Roman</option>
          </select>
        </section>

        <section class="settings-section">
          <h3>Google Sync Sign-In</h3>
          <p class="settings-copy">Signing in with Google OAuth creates a personal Google Sheet in your Drive for Shopkeeper Companion sync data.</p>
          <p class="settings-copy">If you make bulk edits in that sheet, those updates will be reflected in the app during sync.</p>
          <div id="google-auth" class="google-auth"></div>
        </section>

        <section class="settings-section">
          <h3>Blueprint Sync</h3>
          <p class="settings-copy">Refresh the blueprint preview from the latest spreadsheet data.</p>

          <form id="import-form" class="import-form compact-form">
            <button type="submit">Update Blueprints</button>
          </form>
        </section>

        <section class="settings-section">
          <h3>Attribution</h3>
          <details class="attribution-details">
            <summary>Icons</summary>
            <p class="settings-copy"><a class="inline-link" href="https://lucide.dev/" target="_blank" rel="noopener noreferrer">Lucide Icons</a> provides the monochrome SVG icon set used throughout the app.</p>
          </details>
          <details class="attribution-details">
            <summary>Fonts</summary>
            <p class="settings-copy">The aesthetic font style uses Redressed for titles, Bokor for headers and accent labels, and Philosopher for body text.</p>
          </details>
        </section>
      </div>
    </aside>
  </main>
`

const form = document.querySelector('#import-form')
const settingsToggle = document.querySelector('#settings-toggle')
const settingsPanel = document.querySelector('#settings-panel')
const closeSettingsButton = document.querySelector('#close-settings')
const themeInputs = document.querySelectorAll('input[name="theme"]')
const fontSelect = document.querySelector('#font-select')
const statusEl = document.querySelector('#status')
const previewEl = document.querySelector('#preview')
const savedViewsContentEl = document.querySelector('#saved-views-content')
const blueprintOverlay = document.querySelector('#blueprint-overlay')
const blueprintOverlayContent = document.querySelector('#blueprint-overlay-content')
const googleAuthContainer = document.querySelector('#google-auth')
const topTabs = Array.from(document.querySelectorAll('.top-tab'))
const viewPanels = Array.from(document.querySelectorAll('[data-view-panel]'))
let trackedUpgradeKeys = loadTrackedUpgradeKeys()
let allBlueprintItems = []
let savedFilterViews = []
let hasLoadedSavedFilterViews = false
let savedViewCriteria = {
  ...DEFAULT_SAVED_VIEW_CRITERIA,
}
let activeSavedViewPreset = 'custom'
const googleAuth = useGoogleAuth({ clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID })

function openSettings() {
  settingsPanel.classList.add('is-open')
  settingsPanel.setAttribute('aria-hidden', 'false')
  settingsToggle.setAttribute('aria-expanded', 'true')
}

function closeSettings() {
  settingsPanel.classList.remove('is-open')
  settingsPanel.setAttribute('aria-hidden', 'true')
  settingsToggle.setAttribute('aria-expanded', 'false')
}

settingsToggle.addEventListener('click', () => {
  if (settingsPanel.classList.contains('is-open')) {
    closeSettings()
  } else {
    openSettings()
  }
})

closeSettingsButton.addEventListener('click', closeSettings)
settingsPanel.addEventListener('click', (event) => {
  if (event.target === settingsPanel) {
    closeSettings()
  }
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (settingsPanel.classList.contains('is-open')) {
      closeSettings()
    } else if (blueprintOverlay.classList.contains('is-open')) {
      closeBlueprintOverlay()
    }
  }
})

themeInputs.forEach((input) => {
  input.addEventListener('change', () => {
    applyTheme(input.value)
  })
})

fontSelect.addEventListener('change', (event) => {
  const target = event.currentTarget
  applyFontPreference(target.value)
})

topTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const nextView = tab.dataset.view
    topTabs.forEach((candidate) => {
      candidate.classList.toggle('is-active', candidate === tab)
    })
    viewPanels.forEach((panel) => {
      const isActive = panel.dataset.viewPanel === nextView
      panel.classList.toggle('is-hidden', !isActive)
    })
  })
})

applyTheme(getStoredTheme())
applyFontPreference(getStoredFontPreference())
initializeGoogleAuthUi()

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  await importBlueprintData()
})

void importBlueprintData()

function initializeGoogleAuthUi() {
  if (!googleAuthContainer) {
    return
  }

  renderGoogleAuthUi(googleAuth.getState())
  googleAuth.subscribe((state) => {
    renderGoogleAuthUi(state)
  })
}

function renderGoogleAuthUi(state) {
  if (!googleAuthContainer) {
    return
  }

  const signOutDisabled = state.isLoading || state.isAuthenticating || !state.isAuthenticated

  if (state.isAuthenticated) {
    googleAuthContainer.innerHTML = `
      <button type="button" class="auth-button auth-button-secondary" data-auth-action="sign-out" ${signOutDisabled ? 'disabled' : ''}>Sign Out</button>
    `
    const signOutButton = googleAuthContainer.querySelector('[data-auth-action="sign-out"]')
    signOutButton?.addEventListener('click', async () => {
      await googleAuth.signOut()
    })
    return
  }

  googleAuthContainer.innerHTML = '<div class="google-signin-slot" data-auth-signin-slot></div>'
  const signInSlot = googleAuthContainer.querySelector('[data-auth-signin-slot]')
  const renderedGoogleButton = googleAuth.renderSignInButton(signInSlot)

  if (!renderedGoogleButton) {
    const isDisabled = state.isAuthenticating
    googleAuthContainer.innerHTML = `<button type="button" class="auth-button" data-auth-action="sign-in" ${isDisabled ? 'disabled' : ''}>Sign in with Google</button>`
    const signInButton = googleAuthContainer.querySelector('[data-auth-action="sign-in"]')
    signInButton?.addEventListener('click', async () => {
      await googleAuth.signIn()
    })
  }
}

function updateStatus(message, tone = 'info') {
  statusEl.textContent = message
  statusEl.className = `status ${tone}`
}

async function importBlueprintData() {
  try {
    updateStatus('Resolving the latest spreadsheet…')
    const resolvedUrl = await resolveSpreadsheetUrl(DEFAULT_SPREADSHEET_URL)
    const exportUrl = buildExportUrl(resolvedUrl)

    updateStatus('Loading Blueprint data…')
    const { headers, rows, structuredBlueprints } = await importGoogleSheet(exportUrl)
    allBlueprintItems = buildBlueprintItems(headers, rows, structuredBlueprints)

    renderPreview(headers, rows, structuredBlueprints)
    renderSavedViews(allBlueprintItems)
    updateStatus('')
    closeSettings()
  } catch (error) {
    console.error(error)
    updateStatus(error.message || 'The spreadsheet could not be imported.', 'error')
    previewEl.innerHTML = ''
    if (savedViewsContentEl) {
      savedViewsContentEl.innerHTML = '<p class="empty-state">No blueprint data available yet.</p>'
    }
  }
}

function openBlueprintOverlay(item) {
  const visuals = getBlueprintVisuals(item)
  const structuredData = item.structuredData || {}
  const progress = getBlueprintProgressState(item.name)
  const owned = Boolean(progress.owned)
  const blueprintState = {
    own: owned,
    master: Boolean(progress.master),
    inventory: progress.inventory || {},
    collectionBook: progress.collectionBook || {},
    materials: structuredData.materials || {},
  }
  const totalInventory = calculateTotalInventory(blueprintState)
  const collectionStatus = getCollectionBookStatus(blueprintState)
  const tierValue = structuredData.meta?.tier ? String(structuredData.meta.tier) : '—'
  const unlockPrerequisite = structuredData.meta?.unlockPrerequisite ? structuredData.meta.unlockPrerequisite : '—'
  const overviewStats = buildOverviewStats(structuredData, {
    owned,
    unlockPrerequisite,
  })
  const statsMarkup = renderStatsCards(overviewStats)
  const materialsMarkup = renderMaterialsSection(structuredData.materials)
  const upgradesMarkup = renderUpgradeSection(structuredData.upgrades, item.name, owned)
  const inventoryMarkup = renderInventorySection(progress)
  const collectionMarkup = renderCollectionSection(progress, owned)

  blueprintOverlayContent.innerHTML = `
    <div class="overlay-hero">
      <div class="overlay-hero-background overlay-hero-symbol" aria-hidden="true">
        <span class="icon-slot overlay-hero-icon"><i data-lucide="${escapeHtml(getCategoryIconName(visuals.category))}"></i></span>
      </div>
      <div class="overlay-hero-content">
        <div class="overlay-icon-bubble">
          <span class="icon-slot overlay-item-icon"><i data-lucide="${escapeHtml(getBlueprintItemIconName(item))}"></i></span>
        </div>
        <div>
          <p class="overlay-eyebrow">${escapeHtml(`${visuals.category} > ${visuals.type || 'Blueprint'}`)}</p>
          <h3 id="blueprint-overlay-title">${escapeHtml(item.name)}</h3>
          <div class="overlay-meta-row">
            <span class="overlay-tier-badge">Tier ${escapeHtml(tierValue)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="overlay-grid">
      <div class="overlay-card">
        <details class="overlay-section" open>
          <summary class="section-summary">
            <div class="section-summary-title">
              <h4>Quick look</h4>
            </div>
          </summary>
          <div class="section-body">
            <ul class="info-list">
              <li><strong>Total inventory</strong> ${escapeHtml(totalInventory)}</li>
              <li><strong>Collection</strong> ${escapeHtml(collectionStatus || 'Not started')}</li>
            </ul>
          </div>
        </details>
      </div>
      <div class="overlay-card">
        <details class="overlay-section" open>
          <summary class="section-summary">
            <div class="section-summary-title">
              <h4>Stats</h4>
            </div>
          </summary>
          <div class="section-body">
            <div class="info-grid">${statsMarkup}</div>
          </div>
        </details>
      </div>
    </div>

    <div class="overlay-card">
      <details class="overlay-section" open>
        <summary class="section-summary">
          <div class="section-summary-title">
            <h4>Materials</h4>
          </div>
          <label class="owned-toggle">
            <input class="tracking-checkbox owned-checkbox" type="checkbox" data-blueprint-name="${escapeHtml(item.name)}" ${owned ? 'checked' : ''} />
            <span>Owned</span>
          </label>
        </summary>
        <div class="section-body">
          <div class="material-grid">${materialsMarkup}</div>
        </div>
      </details>
    </div>

    <div class="overlay-card">
      <details class="overlay-section" open>
        <summary class="section-summary">
          <div class="section-summary-title">
            <h4>Inventory</h4>
          </div>
          <span class="section-hint">Counts</span>
        </summary>
        <div class="section-body">
          <div class="inventory-grid">${inventoryMarkup}</div>
        </div>
      </details>
    </div>

    <div class="overlay-card">
      <details class="overlay-section" open>
        <summary class="section-summary">
          <div class="section-summary-title">
            <h4>Unlockable upgrades</h4>
          </div>
          <span class="section-hint">${owned ? 'Unlocked' : 'Check Owned to Unlock'}</span>
        </summary>
        <div class="section-body">
          <div class="upgrade-grid">${upgradesMarkup}</div>
        </div>
      </details>
    </div>

    <div class="overlay-card">
      <details class="overlay-section" open>
        <summary class="section-summary">
          <div class="section-summary-title">
            <h4>Collection Book</h4>
          </div>
          <span class="section-hint">${owned ? 'Track qualities' : 'Mark blueprint as Owned first'}</span>
        </summary>
        <div class="section-body">
          <div class="collection-grid">${collectionMarkup}</div>
        </div>
      </details>
    </div>
  `

  renderLucideIcons(blueprintOverlayContent)

  blueprintOverlayContent.querySelectorAll('.owned-toggle input').forEach((control) => {
    control.addEventListener('click', (event) => {
      event.stopPropagation()
    })
  })

  blueprintOverlayContent.querySelectorAll('.tracking-checkbox').forEach((input) => {
    input.addEventListener('change', (event) => {
      const target = event.currentTarget
      if (target.classList.contains('owned-checkbox')) {
        persistBlueprintOwnership(item.name, target.checked)
        openBlueprintOverlay(item)
        return
      }

      toggleTrackedUpgrade(target.dataset.upgradeKey)
    })
  })

  blueprintOverlayContent.querySelectorAll('.quality-input').forEach((input) => {
    input.addEventListener('input', (event) => {
      const target = event.currentTarget
      persistBlueprintInventory(item.name, target.dataset.qualityKey, target.value)
    })
  })

  blueprintOverlayContent.querySelectorAll('.collection-input').forEach((input) => {
    input.addEventListener('change', (event) => {
      const target = event.currentTarget
      persistBlueprintCollection(item.name, target.dataset.qualityKey, target.checked)
    })
  })

  blueprintOverlay.classList.add('is-open')
  blueprintOverlay.setAttribute('aria-hidden', 'false')
}

function renderStatsCards(stats = {}) {
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

function renderMaterialsSection(materials = {}) {
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

function renderUpgradeSection(upgrades = {}, blueprintName = '', owned = false) {
  const groups = [
    { key: 'crafting', label: 'Milestone' },
    { key: 'starforged', label: 'Starforge' },
    { key: 'ascension', label: 'Ascension' },
    { key: 'transcendence', label: 'Transcendence' },
  ]

  const markup = groups.map(({ key, label }) => {
    const entries = Array.isArray(upgrades[key]) ? upgrades[key] : []

    if (!entries.length) {
      return ''
    }

    return `
      <div class="upgrade-group ${owned ? '' : 'is-locked'}">
        <h5>${escapeHtml(label)}</h5>
        <ul class="material-list">
          ${entries.map((entry, index) => {
            const upgradeKey = `${blueprintName}::${key}::${index}::${entry.name || 'Unlock'}`
            const isTracked = isTrackedUpgrade(upgradeKey)
            return `
              <li class="resource-item tracking-item ${owned ? '' : 'is-locked'}">
                <label class="tracking-label">
                  <input class="tracking-checkbox" type="checkbox" data-upgrade-key="${escapeHtml(upgradeKey)}" ${isTracked ? 'checked' : ''} ${owned ? '' : 'disabled'} />
                  <span>${escapeHtml(entry.name || 'Unlock')}</span>
                </label>
                <strong>${escapeHtml(entry.count ? `${entry.count}x` : '')}</strong>
              </li>
            `
          }).join('')}
        </ul>
      </div>
    `
  }).filter(Boolean).join('')

  return markup || '<p class="empty-state">No upgrade milestones listed.</p>'
}

function renderInventorySection(progress = {}) {
  return QUALITY_LABELS.map((label) => {
    const key = label.toLowerCase()
    const value = progress.inventory?.[key] ?? 0
    const qualityClass = getQualityClass(label)
    return `
      <label class="inventory-field inventory-color-only ${qualityClass}" title="${escapeHtml(label)}">
        <input class="quality-input" aria-label="${escapeHtml(label)} quality inventory" type="number" min="0" step="1" value="${value}" data-quality-key="${escapeHtml(key)}" />
      </label>
    `
  }).join('')
}

function renderCollectionSection(progress = {}, isOwned = false) {
  const qualities = ['superior', 'flawless', 'epic', 'legendary']
  const collectionValues = progress.collectionBook || {}

  return `
    <div class="collection-notice">${isOwned ? 'Checked = complete in your collection book.' : 'Set Owned to enable this section.'}</div>
    <div class="inventory-grid">
      ${qualities.map((key) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1)
        const qualityClass = getQualityClass(label)
        return `
          <label class="inventory-field collection-toggle-field ${qualityClass}" title="${escapeHtml(label)}">
            <input class="collection-input" aria-label="${escapeHtml(label)} collection status" type="checkbox" data-quality-key="${escapeHtml(key)}" ${collectionValues[key] ? 'checked' : ''} ${isOwned ? '' : 'disabled'} />
          </label>
        `
      }).join('')}
    </div>
  `
}

function renderSavedViews(items = []) {
  ensureSavedFilterViewsLoaded()

  if (!savedViewsContentEl) {
    return
  }

  if (!Array.isArray(items) || !items.length) {
    savedViewsContentEl.innerHTML = '<p class="empty-state">No blueprint data available yet.</p>'
    return
  }

  const dependencyIndex = buildDependencyIndex(items)
  const filteredItems = filterBlueprintItems(items, savedViewCriteria, dependencyIndex)
  const totalCount = items.length

  savedViewsContentEl.innerHTML = `
    <div class="saved-views-toolbar overlay-card">
      <div class="saved-view-presets">
        ${STARTER_VIEW_PRESETS.map((preset) => `
          <button
            type="button"
            class="saved-view-preset ${activeSavedViewPreset === `starter:${preset.id}` ? 'is-active' : ''}"
            data-starter-view-preset="${escapeHtml(preset.id)}"
          >${escapeHtml(preset.label)}</button>
        `).join('')}
      </div>
      ${renderSavedFilterViews()}
    </div>

    <div class="saved-views-toolbar overlay-card">
      <details class="overlay-section" open>
        <summary class="section-summary">
          <div class="section-summary-title">
            <h4>Filters</h4>
          </div>
          <span class="group-count">${filteredItems.length}/${totalCount}</span>
        </summary>
        <div class="section-body">
          <div class="saved-view-filters">
            <label class="saved-view-filter">
              <span>Dependency</span>
              <select data-saved-filter="dependency">
                ${renderSelectOptions([
                  ['any', 'Any'],
                  ['parent', 'Dependent'],
                  ['child', 'Needed'],
                  ['none', 'No dependency relation'],
                ], savedViewCriteria.dependency)}
              </select>
            </label>
            <label class="saved-view-filter">
              <span>Ownership</span>
              <select data-saved-filter="ownership">
                ${renderSelectOptions([
                  ['any', 'Any'],
                  ['owned', 'Owned'],
                  ['not-owned', 'Not owned'],
                ], savedViewCriteria.ownership)}
              </select>
            </label>
            <label class="saved-view-filter">
              <span>Inventory</span>
              <select data-saved-filter="inventory">
                ${renderSelectOptions([
                  ['any', 'Any'],
                  ['has', 'Inventory > 0'],
                  ['none', 'Inventory = 0'],
                ], savedViewCriteria.inventory)}
              </select>
            </label>
            <label class="saved-view-filter">
              <span>Collection</span>
              <select data-saved-filter="collection">
                ${renderSelectOptions([
                  ['any', 'Any'],
                  ['complete', 'Complete'],
                  ['incomplete', 'Incomplete'],
                ], savedViewCriteria.collection)}
              </select>
            </label>
          </div>
          <form class="saved-view-save-row" data-save-view-form>
            <input type="text" maxlength="60" placeholder="View Name (e.g. Not Owned + Dependents)" data-saved-view-name />
            <button type="submit" class="saved-view-save-button">Save New View</button>
          </form>
        </div>
      </details>
    </div>

    <div class="saved-view-results overlay-card">
      <details class="overlay-section" open>
        <summary class="section-summary">
          <div class="section-summary-title">
            <h4>Results</h4>
          </div>
          <span class="group-count">${filteredItems.length}</span>
        </summary>
        <div class="section-body">
          ${renderSavedViewResults(filteredItems, dependencyIndex)}
        </div>
      </details>
    </div>
  `

  bindSavedViewControls(items)
  renderLucideIcons(savedViewsContentEl)
}

function renderSavedViewResults(items = [], dependencyIndex) {
  if (!items.length) {
    return '<p class="empty-state">No blueprints match this criteria set.</p>'
  }

  const grouped = new Map()

  items.forEach((item) => {
    const category = item?.classification?.category || 'Accessories'
    const type = item?.classification?.type || 'Unknown'
    const categoryTypeKey = `${category}::${type}`

    if (!grouped.has(categoryTypeKey)) {
      grouped.set(categoryTypeKey, {
        category,
        type,
        items: [],
      })
    }

    grouped.get(categoryTypeKey).items.push(item)
  })

  return Array.from(grouped.values()).map((group) => {
    const listMarkup = group.items.map((item) => {
      const summary = buildBlueprintSummary(item, dependencyIndex)
      const dependencyText = buildDependencySummaryLine(summary)
      const collectionText = summary.isCollectionComplete ? 'Collection Complete' : `Collection ${summary.collectionStatus || 'Not started'}`
      const ownershipText = summary.isOwned ? 'Owned' : 'Not Owned'

      return `
        <li class="resource-item dependency-item saved-view-item" data-blueprint-name="${escapeHtml(item.name)}">
          <span>
            <strong>${escapeHtml(item.name)}</strong><br>
            <small>${escapeHtml(`${ownershipText} · Inventory ${summary.totalInventory} · ${collectionText}`)}</small><br>
            <small>${escapeHtml(dependencyText)}</small>
          </span>
        </li>
      `
    }).join('')

    return `
      <details class="blueprint-type" open>
        <summary>
          <span class="group-summary-title">
            <span class="icon-slot group-summary-icon" aria-hidden="true"><i data-lucide="${escapeHtml(getTypeIconName(group.type, group.category))}"></i></span>
            <span>${escapeHtml(group.category)} > ${escapeHtml(group.type)}</span>
          </span>
          <span class="group-count">${group.items.length}</span>
        </summary>
        <ul class="material-list dependency-list">${listMarkup}</ul>
      </details>
    `
  }).join('')
}

function bindSavedViewControls(items = []) {
  if (!savedViewsContentEl) {
    return
  }

  savedViewsContentEl.querySelectorAll('[data-starter-view-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      const presetId = button.dataset.starterViewPreset
      applyStarterViewPreset(presetId, items)
    })
  })

  savedViewsContentEl.querySelectorAll('[data-saved-filter-view-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const viewId = button.dataset.savedFilterViewId
      applySavedFilterView(viewId, items)
    })
  })

  savedViewsContentEl.querySelectorAll('[data-delete-saved-filter-view-id]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      const viewId = button.dataset.deleteSavedFilterViewId
      deleteSavedFilterView(viewId)
      renderSavedViews(items)
    })
  })

  savedViewsContentEl.querySelectorAll('[data-saved-filter]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const target = event.currentTarget
      const key = target.dataset.savedFilter
      if (!key) {
        return
      }

      savedViewCriteria = {
        ...savedViewCriteria,
        [key]: target.value,
      }

      activeSavedViewPreset = 'custom'
      renderSavedViews(items)
    })
  })

  const saveViewForm = savedViewsContentEl.querySelector('[data-save-view-form]')
  if (saveViewForm) {
    saveViewForm.addEventListener('submit', (event) => {
      event.preventDefault()
      const nameInput = savedViewsContentEl.querySelector('[data-saved-view-name]')
      const nextName = cleanText(nameInput?.value)

      if (!nextName) {
        return
      }

      const savedView = saveCurrentFilterAsView(nextName)
      activeSavedViewPreset = `saved:${savedView.id}`
      renderSavedViews(items)
    })
  }

  savedViewsContentEl.querySelectorAll('.saved-view-item').forEach((node) => {
    node.addEventListener('click', () => {
      const blueprintName = node.getAttribute('data-blueprint-name')
      const item = items.find((entry) => entry.name === blueprintName)
      if (item) {
        openBlueprintOverlay(item)
      }
    })
  })
}

function applyStarterViewPreset(presetId, items = []) {
  const preset = STARTER_VIEW_PRESETS.find((entry) => entry.id === presetId)
  if (!preset) {
    return
  }

  activeSavedViewPreset = `starter:${preset.id}`
  savedViewCriteria = {
    ...DEFAULT_SAVED_VIEW_CRITERIA,
    ...preset.criteria,
  }

  renderSavedViews(items)
}

function applySavedFilterView(viewId, items = []) {
  const view = savedFilterViews.find((entry) => entry.id === viewId)
  if (!view) {
    return
  }

  activeSavedViewPreset = `saved:${view.id}`
  savedViewCriteria = {
    ...DEFAULT_SAVED_VIEW_CRITERIA,
    ...(view.criteria || {}),
  }

  renderSavedViews(items)
}

function renderSavedFilterViews() {
  if (!savedFilterViews.length) {
    return ''
  }

  return `
    <div class="saved-filter-list">
      ${savedFilterViews.map((view) => `
        <div class="saved-filter-row">
          <button
            type="button"
            class="saved-view-preset ${activeSavedViewPreset === `saved:${view.id}` ? 'is-active' : ''}"
            data-saved-filter-view-id="${escapeHtml(view.id)}"
          >${escapeHtml(view.name)}</button>
          <button
            type="button"
            class="saved-view-delete"
            data-delete-saved-filter-view-id="${escapeHtml(view.id)}"
            aria-label="Delete ${escapeHtml(view.name)}"
          >×</button>
        </div>
      `).join('')}
    </div>
  `
}

function renderSelectOptions(options = [], selectedValue = 'any') {
  return options.map(([value, label]) => {
    const selected = value === selectedValue ? 'selected' : ''
    return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(label)}</option>`
  }).join('')
}

function buildDependencyIndex(items = []) {
  const dependentsByComponent = new Map()

  items.forEach((item) => {
    const components = getBlueprintMaterials(item).components || []

    components.forEach((component) => {
      const componentName = normalizeBlueprintName(component?.name)
      if (!componentName) {
        return
      }

      if (!dependentsByComponent.has(componentName)) {
        dependentsByComponent.set(componentName, new Set())
      }

      dependentsByComponent.get(componentName).add(item.name)
    })
  })

  return {
    dependentsByComponent,
  }
}

function filterBlueprintItems(items = [], criteria = {}, dependencyIndex) {
  return items.filter((item) => {
    const summary = buildBlueprintSummary(item, dependencyIndex)

    if (criteria.dependency === 'parent' && !summary.isParentDependency) {
      return false
    }

    if (criteria.dependency === 'child' && !summary.isChildDependency) {
      return false
    }

    if (criteria.dependency === 'none' && (summary.isParentDependency || summary.isChildDependency)) {
      return false
    }

    if (criteria.ownership === 'owned' && !summary.isOwned) {
      return false
    }

    if (criteria.ownership === 'not-owned' && summary.isOwned) {
      return false
    }

    if (criteria.inventory === 'has' && !summary.hasInventory) {
      return false
    }

    if (criteria.inventory === 'none' && summary.hasInventory) {
      return false
    }

    if (criteria.collection === 'complete' && !summary.isCollectionComplete) {
      return false
    }

    if (criteria.collection === 'incomplete' && summary.isCollectionComplete) {
      return false
    }

    return true
  })
}

function buildBlueprintSummary(item, dependencyIndex) {
  const progress = getBlueprintProgressState(item.name)
  const blueprintState = {
    own: Boolean(progress.owned),
    master: Boolean(progress.master),
    inventory: progress.inventory || {},
    collectionBook: progress.collectionBook || {},
    materials: getBlueprintMaterials(item),
  }

  const normalizedName = normalizeBlueprintName(item.name)
  const dependentSet = dependencyIndex?.dependentsByComponent?.get(normalizedName)
  const dependentNames = dependentSet ? [...dependentSet] : []
  const totalInventory = calculateTotalInventory(blueprintState)
  const collectionStatus = getCollectionBookStatus(blueprintState)

  return {
    isOwned: Boolean(progress.owned),
    isParentDependency: hasCraftingComponents(item),
    isChildDependency: dependentNames.length > 0,
    dependentNames,
    hasInventory: totalInventory > 0,
    totalInventory,
    isCollectionComplete: collectionStatus === '✅ Complete',
    collectionStatus,
  }
}

function buildDependencySummaryLine(summary = {}) {
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

function loadSavedFilterViews() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAVED_FILTER_VIEWS_STORAGE_KEY) || '[]')
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
          criteria: {
            ...DEFAULT_SAVED_VIEW_CRITERIA,
            ...(entry.criteria || {}),
          },
        }
      })
      .filter(Boolean)
  } catch (error) {
    console.warn('Unable to load saved filter views.', error)
    return []
  }
}

function ensureSavedFilterViewsLoaded() {
  if (hasLoadedSavedFilterViews) {
    return
  }

  savedFilterViews = loadSavedFilterViews()
  hasLoadedSavedFilterViews = true
}

function saveSavedFilterViews() {
  localStorage.setItem(SAVED_FILTER_VIEWS_STORAGE_KEY, JSON.stringify(savedFilterViews))
}

function saveCurrentFilterAsView(name) {
  const normalizedName = name.toLowerCase()
  const existing = savedFilterViews.find((entry) => entry.name.toLowerCase() === normalizedName)

  if (existing) {
    existing.criteria = {
      ...savedViewCriteria,
    }
    saveSavedFilterViews()
    return existing
  }

  const nextView = {
    id: `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    criteria: {
      ...savedViewCriteria,
    },
  }

  savedFilterViews = [nextView, ...savedFilterViews]
  saveSavedFilterViews()
  return nextView
}

function deleteSavedFilterView(viewId) {
  if (!viewId) {
    return
  }

  savedFilterViews = savedFilterViews.filter((entry) => entry.id !== viewId)
  if (activeSavedViewPreset === `saved:${viewId}`) {
    activeSavedViewPreset = 'custom'
  }
  saveSavedFilterViews()
}

function loadTrackedUpgradeKeys() {
  try {
    const stored = JSON.parse(localStorage.getItem(TRACKED_UPGRADES_STORAGE_KEY) || '[]')
    return new Set(Array.isArray(stored) ? stored : [])
  } catch (error) {
    console.warn('Unable to load tracked upgrades.', error)
    return new Set()
  }
}

function saveTrackedUpgradeKeys() {
  localStorage.setItem(TRACKED_UPGRADES_STORAGE_KEY, JSON.stringify([...trackedUpgradeKeys]))
}

function toggleTrackedUpgrade(key) {
  if (!key) {
    return
  }

  if (trackedUpgradeKeys.has(key)) {
    trackedUpgradeKeys.delete(key)
  } else {
    trackedUpgradeKeys.add(key)
  }

  saveTrackedUpgradeKeys()
}

function isTrackedUpgrade(key) {
  return trackedUpgradeKeys.has(key)
}

function getBlueprintMilestoneKeys(blueprintName, entries = []) {
  return entries.map((entry, index) => `${blueprintName}::crafting::${index}::${entry.name || 'Unlock'}`)
}

function getBlueprintProgressState(blueprintName) {
  try {
    const stored = JSON.parse(localStorage.getItem(BLUEPRINT_PROGRESS_STORAGE_KEY) || '{}')
    return stored[blueprintName] || {}
  } catch (error) {
    console.warn('Unable to load blueprint progress.', error)
    return {}
  }
}

function saveBlueprintProgressState(blueprintName, updates) {
  try {
    const stored = JSON.parse(localStorage.getItem(BLUEPRINT_PROGRESS_STORAGE_KEY) || '{}')
    stored[blueprintName] = {
      ...(stored[blueprintName] || {}),
      ...updates,
    }
    localStorage.setItem(BLUEPRINT_PROGRESS_STORAGE_KEY, JSON.stringify(stored))
  } catch (error) {
    console.warn('Unable to save blueprint progress.', error)
  }
}

function persistBlueprintOwnership(blueprintName, owned) {
  saveBlueprintProgressState(blueprintName, { owned })
}

function persistBlueprintInventory(blueprintName, qualityKey, value) {
  const progress = getBlueprintProgressState(blueprintName)
  const inventory = {
    ...(progress.inventory || {}),
  }
  inventory[qualityKey] = Number(value) || 0
  saveBlueprintProgressState(blueprintName, { inventory })
}

function persistBlueprintCollection(blueprintName, qualityKey, checked) {
  const progress = getBlueprintProgressState(blueprintName)
  const collectionBook = {
    ...(progress.collectionBook || {}),
  }
  collectionBook[qualityKey] = Boolean(checked)
  saveBlueprintProgressState(blueprintName, { collectionBook })
}

function getQualityClass(label) {
  switch (label) {
    case 'Superior':
      return 'quality-superior'
    case 'Flawless':
      return 'quality-flawless'
    case 'Epic':
      return 'quality-epic'
    case 'Legendary':
      return 'quality-legendary'
    default:
      return 'quality-normal'
  }
}

function persistBlueprintCollectionStatus(blueprintName, submitted) {
  saveBlueprintProgressState(blueprintName, { collectionSubmitted: submitted })
}

function buildOverviewStats(structuredData = {}, options = {}) {
  const baseStats = {
    ...(structuredData?.stats || {}),
  }

  const value = structuredData?.economy?.value
  const craftingTimeSeconds = structuredData?.economy?.craftingTimeSeconds

  if (value !== undefined) {
    baseStats.value = value
  }

  if (craftingTimeSeconds !== undefined) {
    baseStats.craftingTime = `${formatValue(craftingTimeSeconds)}s`
  }

  const unlockPrerequisite = cleanText(options.unlockPrerequisite)
  if (!options.owned && unlockPrerequisite && /chest/i.test(unlockPrerequisite)) {
    baseStats.unlock = unlockPrerequisite
  }

  return baseStats
}

function calculateTotalInventory(blueprint) {
  const inventory = blueprint?.inventory || {}

  return INVENTORY_QUALITY_KEYS.reduce((total, qualityKey) => {
    return total + toInventoryCount(inventory[qualityKey])
  }, 0)
}

function isQualityDone(blueprint, quality) {
  if (!isBlueprintOwned(blueprint)) {
    return false
  }

  if (!Boolean(blueprint?.master)) {
    return toInventoryCount(blueprint?.inventory?.[quality]) > 0
  }

  return blueprint?.collectionBook?.[quality] === true
}

function getCollectionBookStatus(blueprint) {
  if (!isBlueprintOwned(blueprint)) {
    return ''
  }

  for (const quality of COLLECTION_BOOK_QUALITY_ORDER) {
    if (!isQualityDone(blueprint, quality)) {
      return formatQualityLabel(quality)
    }
  }

  return '✅ Complete'
}

function hasCraftingComponents(blueprint) {
  const materials = getBlueprintMaterials(blueprint)
  const components = Array.isArray(materials.components) ? materials.components : []

  return components.some((component) => cleanText(component?.name))
}

function getDependentBlueprints(blueprintName, allBlueprints = []) {
  const target = normalizeBlueprintName(blueprintName)
  if (!target || !Array.isArray(allBlueprints)) {
    return []
  }

  return allBlueprints.filter((blueprint) => {
    if (!hasCraftingComponents(blueprint)) {
      return false
    }

    const materials = getBlueprintMaterials(blueprint)
    const components = Array.isArray(materials.components) ? materials.components : []

    return components.some((component) => normalizeBlueprintName(component?.name) === target)
  })
}

function getBlueprintMaterials(blueprint) {
  if (blueprint?.structuredData?.materials) {
    return blueprint.structuredData.materials
  }

  if (blueprint?.materials) {
    return blueprint.materials
  }

  return {}
}

function isBlueprintOwned(blueprint) {
  return Boolean(blueprint?.own ?? blueprint?.owned)
}

function toInventoryCount(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  return parsed
}

function formatQualityLabel(quality) {
  const normalized = String(quality || '').trim().toLowerCase()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function normalizeBlueprintName(value) {
  return cleanText(value).toLowerCase()
}

function formatStatLabel(key) {
  const labelMap = {
    atk: 'ATK',
    def: 'DEF',
    hp: 'HP',
    eva: 'EVA',
    crit: 'CRIT',
    elementalAffinity: 'Elemental Affinity',
    spiritAffinity: 'Spirit Affinity',
    builtInElement: 'Built-In Element',
    builtInSpirit: 'Built-In Spirit',
    value: 'Value',
    craftingTime: 'Craft Time',
    unlock: 'Unlock',
  }

  return labelMap[key] || String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase())
}

function formatMaterialLabel(key) {
  if (typeof key === 'string' && RESOURCE_LABELS.includes(key)) {
    return key
  }

  const labelMap = {
    resource1: RESOURCE_LABELS[0] || 'Resource 1',
    resource2: RESOURCE_LABELS[1] || 'Resource 2',
    resource3: RESOURCE_LABELS[2] || 'Resource 3',
    resource4: RESOURCE_LABELS[3] || 'Resource 4',
    resource5: RESOURCE_LABELS[4] || 'Resource 5',
    resource6: RESOURCE_LABELS[5] || 'Resource 6',
    resource7: RESOURCE_LABELS[6] || 'Resource 7',
    resource8: RESOURCE_LABELS[7] || 'Resource 8',
    resource9: RESOURCE_LABELS[8] || 'Resource 9',
    resource10: RESOURCE_LABELS[9] || 'Resource 10',
  }

  return labelMap[key] || String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase())
}

function formatValue(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
  }

  return String(value)
}

function closeBlueprintOverlay() {
  blueprintOverlay.classList.remove('is-open')
  blueprintOverlay.setAttribute('aria-hidden', 'true')
  blueprintOverlayContent.innerHTML = ''
}

function getBlueprintVisuals(item) {
  const category = item?.classification?.category || 'Accessories'
  const type = item?.classification?.type || item?.structuredData?.meta?.type || ''
  const itemAsset = getItemAsset(item?.name || '', type, category)
  const iconAsset = itemAsset || getTypeIconAsset(type, item?.name || '', category)
  const categoryAsset = getCategoryBackgroundAsset(category)

  return {
    category,
    type,
    iconAsset,
    categoryAsset,
  }
}

function getCategoryVisuals(category) {
  switch (category) {
    case 'Weapons':
      return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_weapons_landscape_selected.png' }
    case 'Armor':
      return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_armor_landscape_selected.png' }
    case 'Accessories':
      return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_accessories_landscape_selected.png' }
    case 'Enchantments':
      return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_enchantment_landscape_selected.png' }
    default:
      return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_all_landscape_selected.png' }
  }
}

function getTypeGroupVisuals(typeTitle, category) {
  const haystack = `${typeTitle || ''}`.toLowerCase()

  if (/sword/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_weapons_landscape_selected.png' }
  }

  if (/axe/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_weapons_landscape_selected.png' }
  }

  if (/dagger/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_weapons_landscape_selected.png' }
  }

  if (/mace/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_weapons_landscape_selected.png' }
  }

  if (/spear/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_weapons_landscape_selected.png' }
  }

  if (/bow/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_weapons_landscape_selected.png' }
  }

  if (/wand/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_weapons_landscape_selected.png' }
  }

  if (/staff/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_weapons_landscape_selected.png' }
  }

  if (/crossbow/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_weapons_landscape_selected.png' }
  }

  if (/shield/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_accessories_landscape_selected.png' }
  }

  if (/cloak/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_accessories_landscape_selected.png' }
  }

  if (/ring/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_accessories_landscape_selected.png' }
  }

  if (/amulet/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_accessories_landscape_selected.png' }
  }

  if (/familiar/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_accessories_landscape_selected.png' }
  }

  if (/potion|herbal|remedy|herb/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_accessories_landscape_selected.png' }
  }

  if (/spell|scroll/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_accessories_landscape_selected.png' }
  }

  if (/spirit/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_enchantment_landscape_selected.png' }
  }

  if (/element/i.test(haystack)) {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_enchantment_landscape_selected.png' }
  }

  if (category === 'Enchantments') {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_enchantment_landscape_selected.png' }
  }

  if (category === 'Armor') {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_armor_landscape_selected.png' }
  }

  if (category === 'Weapons') {
    return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_weapons_landscape_selected.png' }
  }

  return { icon: '/Fan Kit Assets (Shop Titans)/Filter Types/icon_global_itemtype_all_landscape_selected.png' }
}

function getCategoryBackgroundAsset(category) {
  switch (category) {
    case 'Weapons':
      return '/Fan Kit Assets (Shop Titans)/Blueprint Types/Backgrounds/img_card_circle_blueprint_blue.png'
    case 'Armor':
      return '/Fan Kit Assets (Shop Titans)/Blueprint Types/Backgrounds/img_card_circle_blueprint_chest.png'
    case 'Accessories':
      return '/Fan Kit Assets (Shop Titans)/Blueprint Types/Backgrounds/img_card_circle_blueprint_artifact.png'
    case 'Enchantments':
      return '/Fan Kit Assets (Shop Titans)/Blueprint Types/Backgrounds/img_card_circle_blueprint_premium.png'
    default:
      return '/Fan Kit Assets (Shop Titans)/Blueprint Types/Backgrounds/img_card_circle_blueprint.png'
  }
}

function getTypeIconAsset(type, name, category) {
  return getItemAsset(name, type, category)
}

function getItemAsset(name, type, category) {
  const haystack = `${type || ''} ${name || ''}`.toLowerCase()

  if (category === 'Weapons') {
    if (/crossbow|gun/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_crossbow_big.png'
    }
    if (/bow/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_bow_big.png'
    }
    if (/wand/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_wand_big.png'
    }
    if (/staff/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_staff_big.png'
    }
    if (/dagger/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_dagger_big.png'
    }
    if (/mace/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_mace_big.png'
    }
    if (/spear/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_spear_big.png'
    }
    if (/axe/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_axe_big.png'
    }
    return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_sword_big.png'
  }

  if (category === 'Armor') {
    if (/helmet|hat/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_helmet_big.png'
    }
    if (/gauntlet|glove|bracer/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_gauntlets_big.png'
    }
    if (/shoe|boot|footwear/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_shoes_big.png'
    }
    if (/cloak/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_cloak_big.png'
    }
    return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_armorheavy_big.png'
  }

  if (category === 'Accessories') {
    if (/potion|herb|remedy/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_potion_big.png'
    }
    if (/spell|scroll/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_scrolls_big.png'
    }
    if (/shield/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_shield_big.png'
    }
    if (/cloak/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_cloak_big.png'
    }
    if (/ring/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_ring_big.png'
    }
    if (/amulet/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_amulet_big.png'
    }
    if (/familiar/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_familiar_big.png'
    }
    return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_tag.png'
  }

  if (category === 'Enchantments') {
    if (/spirit/i.test(haystack)) {
      return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_spirit_big.png'
    }
    return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_element_big.png'
  }

  return '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_tag.png'
}

function buildAssetSrc(path, fallbackPath = '/Fan Kit Assets (Shop Titans)/Item Types/icon_global_item_tag.png') {
  const resolvedPath = path && String(path).trim() ? path : fallbackPath
  return encodeURI(resolvedPath)
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function applyTheme(theme) {
  const resolvedTheme = theme === 'light' || theme === 'dark' ? theme : 'device'
  const isDark = resolvedTheme === 'dark' || (resolvedTheme === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  document.documentElement.dataset.theme = resolvedTheme
  document.body.classList.toggle('theme-dark', isDark)
  document.body.classList.toggle('theme-light', !isDark)

  const selectedInput = Array.from(themeInputs).find((input) => input.value === resolvedTheme)
  if (selectedInput) {
    selectedInput.checked = true
  }

  localStorage.setItem('shopkeeper-theme', resolvedTheme)
}

function applyFontPreference(fontPreference) {
  const resolvedFont = ['default', 'serif', 'sans'].includes(fontPreference) ? fontPreference : 'default'
  document.documentElement.dataset.fontPreference = resolvedFont

  if (fontSelect) {
    fontSelect.value = resolvedFont
  }

  localStorage.setItem(FONT_PREFERENCE_STORAGE_KEY, resolvedFont)
}

function getStoredTheme() {
  return localStorage.getItem('shopkeeper-theme') || 'device'
}

function getStoredFontPreference() {
  return localStorage.getItem(FONT_PREFERENCE_STORAGE_KEY) || 'default'
}

async function resolveSpreadsheetUrl(rawUrl) {
  const normalizedUrl = normalizeUrl(rawUrl)
  const proxyUrl = `/api/resolve?url=${encodeURIComponent(normalizedUrl)}`
  const response = await fetch(proxyUrl)

  if (!response.ok) {
    throw new Error(`The spreadsheet link returned ${response.status}.`)
  }

  const resolved = await response.text()
  return resolved.trim()
}

function normalizeUrl(rawUrl) {
  const trimmed = rawUrl.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

function buildExportUrl(resolvedUrl) {
  const pageUrl = new URL(resolvedUrl)
  const match = pageUrl.pathname.match(/\/spreadsheets\/d\/([^/]+)/)

  if (!match) {
    throw new Error('The resolved URL did not point to a Google Sheet.')
  }

  const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq`)
  exportUrl.searchParams.set('tqx', 'out:json')
  exportUrl.searchParams.set('sheet', 'BLUEPRINTS')

  if (pageUrl.searchParams.has('gid')) {
    exportUrl.searchParams.set('gid', pageUrl.searchParams.get('gid'))
  }

  return exportUrl.toString()
}

async function importGoogleSheet(exportUrl) {
  const requestUrl = import.meta.env.DEV
    ? `/api/spreadsheet?url=${encodeURIComponent(exportUrl)}`
    : exportUrl

  const response = await fetch(requestUrl)

  if (!response.ok) {
    throw new Error(`The sheet export returned ${response.status}.`)
  }

  const text = await response.text()
  const parseStart = text.indexOf('{')
  const parseEnd = text.lastIndexOf('}')

  if (parseStart === -1 || parseEnd <= parseStart) {
    throw new Error('The sheet response could not be parsed.')
  }

  const payload = JSON.parse(text.slice(parseStart, parseEnd + 1))
  const rows = payload?.table?.rows ?? []
  const headers = (payload?.table?.cols ?? []).map((column) => (column?.label || '').toString().trim())
  const dataRows = rows.map((row) => row?.c?.map((cell) => cell?.v ?? '') ?? [])
  const structuredBlueprints = dataRows.map((row) => convertBlueprintRowToObject(headers, row))

  return {
    headers,
    rows: dataRows,
    structuredBlueprints,
  }
}

function renderLucideIcons(root = document) {
  createIcons({
    icons: LUCIDE_ICONS,
    root,
  })
}

function renderPreview(headers, rows, structuredBlueprints = []) {
  const openDrawerKeys = new Set(
    Array.from(previewEl.querySelectorAll('details[data-drawer-key][open]')).map((node) => node.dataset.drawerKey)
  )

  previewEl.innerHTML = ''

  if (!headers.length && !rows.length) {
    previewEl.innerHTML = '<p class="empty">No rows were returned from the sheet.</p>'
    return
  }

  const groups = buildBlueprintGroups(headers, rows, structuredBlueprints)
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
        const tierText = item.structuredData?.meta?.tier ? `Tier ${item.structuredData.meta.tier}` : 'Tier —'
        listItem.innerHTML = `
          <div class="item-copy">
            <div class="item-title-row">
              <span class="icon-slot item-card-icon" aria-hidden="true"><i data-lucide="${escapeHtml(getBlueprintItemIconName(item))}"></i></span>
              <span class="item-name">${escapeHtml(item.name)}</span>
              <span class="item-tier-badge">${escapeHtml(tierText)}</span>
            </div>
          </div>
        `
        listItem.addEventListener('click', () => openBlueprintOverlay(item))
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

  blueprintOverlay.querySelectorAll('[data-close-overlay="true"]').forEach((node) => {
    node.addEventListener('click', closeBlueprintOverlay)
  })

  previewEl.appendChild(container)
  renderLucideIcons(container)
}

function buildBlueprintGroups(headers, rows, structuredBlueprints = []) {
  const items = buildBlueprintItems(headers, rows, structuredBlueprints)

  const categoryMaps = CATEGORY_DEFINITIONS.map((definition) => ({
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

function buildBlueprintItems(headers, rows, structuredBlueprints = []) {
  const nameIndex = getColumnIndex(headers, 'Name', 'Item Name', 'Blueprint Name')
  const typeIndex = getColumnIndex(headers, 'Type', 'Item Type', 'Category')
  const tierIndex = getColumnIndex(headers, 'Tier', 'Rank', 'Level')

  const resolvedNameIndex = nameIndex >= 0 ? nameIndex : 0
  const resolvedTypeIndex = typeIndex >= 0 ? typeIndex : 1
  const resolvedTierIndex = tierIndex >= 0 ? tierIndex : -1

  const items = []

  rows.forEach((row, rowIndex) => {
    const name = getCellValue(row, resolvedNameIndex)
    const type = getCellValue(row, resolvedTypeIndex)
    const tier = getCellValue(row, resolvedTierIndex)
    const structuredData = structuredBlueprints[rowIndex] || {}

    if (!name) {
      return
    }

    const classification = classifyBlueprint(type, name)
    items.push({
      name,
      meta: tier ? `Tier ${tier}` : 'No tier',
      structuredData,
      classification,
    })
  })

  return items
}

function convertBlueprintRowToObject(headers, row) {
  const blueprint = {
    meta: {},
    economy: {},
    workers: [],
    materials: {
      resources: {},
      components: [],
    },
    stats: {},
    upgrades: {
      crafting: [],
      starforged: [],
      ascension: [],
      transcendence: [],
    },
  }

  const addMeta = (label, key, parser = (value) => value) => {
    const value = parser(getCellValue(row, getColumnIndex(headers, label)))
    if (value !== undefined && value !== '' && value !== '---') {
      blueprint.meta[key] = value
    }
  }

  const addEconomy = (label, key, parser = (value) => value) => {
    const value = parser(getCellValue(row, getColumnIndex(headers, label)))
    if (value !== undefined && value !== '' && value !== '---') {
      blueprint.economy[key] = value
    }
  }

  addMeta('Name', 'name', (value) => cleanText(value))
  addMeta('Type', 'type', (value) => cleanText(value))
  addMeta('Tier', 'tier', (value) => parseNumericValue(value))
  addMeta('Unlock Prerequisite', 'unlockPrerequisite', (value) => cleanText(value))
  addMeta('Research Scrolls', 'researchScrolls', (value) => parseNumericValue(value))
  addMeta('Antique Tokens', 'antiqueTokens', (value) => parseNumericValue(value))
  addMeta('Available as an Antique starting on (UTC)', 'availableAsAntiqueDate', (value) => cleanText(value))

  addEconomy('Value', 'value', (value) => parseNumericValue(value))
  addEconomy('Crafting Time (seconds)', 'craftingTimeSeconds', (value) => parseNumericValue(value))
  addEconomy('Value / Crafting Time', 'valueCraftTimeRatio', (value) => parseNumericValue(value))
  addEconomy('Merchant XP', 'merchantXp', (value) => parseNumericValue(value))
  addEconomy('Worker XP', 'workerXp', (value) => parseNumericValue(value))
  addEconomy('Fusion XP', 'fusionXp', (value) => parseNumericValue(value))
  addEconomy('Favor', 'favor', (value) => parseNumericValue(value))
  addEconomy('Airship Power', 'airshipPower', (value) => parseNumericValue(value))

  const energyLabels = [
    ['Discount Energy', 'discount'],
    ['Surcharge Energy', 'surcharge'],
    ['Suggest Energy', 'suggest'],
    ['Speed Up Energy', 'speedUp'],
  ]
  energyLabels.forEach(([label, key]) => {
    addEconomy(label, `energy${capitalize(key)}`, (value) => parseNumericValue(value))
  })
  if (Object.keys(blueprint.economy).length) {
    blueprint.economy.energy = {}
    Object.entries(blueprint.economy)
      .filter(([key]) => key.startsWith('energy'))
      .forEach(([key, value]) => {
        blueprint.economy.energy[key.replace(/^energy/, '').toLowerCase()] = value
        delete blueprint.economy[key]
      })
  }

  const workerNameIndexes = findColumnIndexes(headers, ['Required Worker'])
  const workerLevelIndexes = findColumnIndexes(headers, ['Worker Level'])

  workerNameIndexes.forEach((nameIndex, index) => {
    const levelIndex = workerLevelIndexes[index]
    const nameValue = cleanText(getCellValue(row, nameIndex))
    const levelValue = parseNumericValue(getCellValue(row, levelIndex))

    if (nameValue && nameValue !== '---') {
      blueprint.workers.push({
        name: nameValue,
        level: levelValue ?? undefined,
      })
    }
  })

  const componentIndexes = findColumnIndexes(headers, ['Component'])
  componentIndexes.forEach((componentIndex) => {
    const nameValue = cleanText(getCellValue(row, componentIndex))
    const qualityValue = cleanText(getCellValue(row, componentIndex + 1))
    const countValue = parseNumericValue(getCellValue(row, componentIndex + 2))

    if (nameValue && nameValue !== '---') {
      blueprint.materials.components.push({
        name: nameValue,
        quality: qualityValue || undefined,
        count: countValue ?? undefined,
      })
    }
  })

  const workerBoundary = Math.max(...workerLevelIndexes, ...workerNameIndexes, 0)
  const materialsStart = workerBoundary + 1
  const materialsEnd = componentIndexes[0] ?? headers.length
  const resourceValues = []
  for (let index = materialsStart; index < materialsEnd; index += 1) {
    const value = getCellValue(row, index)
    if (!isMeaningfulValue(value)) {
      continue
    }
    resourceValues.push(value)
  }

  if (resourceValues.length) {
    resourceValues.forEach((value, index) => {
      const parsedValue = parseNumericValue(value)
      const normalizedValue = parsedValue ?? cleanText(value)
      if (normalizedValue !== undefined && normalizedValue !== '' && normalizedValue !== '---') {
        const resourceLabel = RESOURCE_LABELS[index] || `Resource ${index + 1}`
        blueprint.materials.resources[resourceLabel] = normalizedValue
      }
    })
  }

  const addStat = (label, key) => {
    const value = getCellValue(row, getColumnIndex(headers, label))
    const parsedValue = parseNumericValue(value)
    if (parsedValue !== undefined) {
      blueprint.stats[key] = parsedValue
    } else if (isMeaningfulValue(value)) {
      blueprint.stats[key] = cleanText(value)
    }
  }

  addStat('ATK', 'atk')
  addStat('DEF', 'def')
  addStat('HP', 'hp')
  addStat('EVA', 'eva')
  addStat('CRIT', 'crit')
  addStat('Elemental Affinity', 'elementalAffinity')
  addStat('Spirit Affinity', 'spiritAffinity')
  addStat('Built-In Element', 'builtInElement')
  addStat('Built-In Spirit', 'builtInSpirit')

  const upgradeGroups = [
    { key: 'crafting', labelPrefix: 'Crafting Upgrade', countLabel: 'Crafts Needed' },
    { key: 'starforged', labelPrefix: 'Starforged Milestone', countLabel: 'Crafts Needed' },
    { key: 'ascension', labelPrefix: 'Ascension Upgrade', countLabel: 'Shards Needed' },
    { key: 'transcendence', labelPrefix: 'Transcendence Upgrade', countLabel: 'Seals Needed' },
  ]

  upgradeGroups.forEach(({ key, labelPrefix, countLabel }) => {
    for (let index = 1; index <= 5; index += 1) {
      const upgradeIndex = getColumnIndex(headers, `${labelPrefix} ${index}`)
      const countIndex = upgradeIndex + 1
      const upgradeValue = cleanText(getCellValue(row, upgradeIndex))
      const countValue = parseNumericValue(getCellValue(row, countIndex))

      if (upgradeValue || countValue !== undefined) {
        blueprint.upgrades[key].push({
          name: upgradeValue || undefined,
          count: countValue ?? undefined,
        })
      }
    }
  })

  return blueprint
}

function cleanText(value) {
  if (value === null || value === undefined) {
    return ''
  }

  const text = String(value).trim()
  if (!text || text === '---') {
    return ''
  }

  return text
}

function isMeaningfulValue(value) {
  if (value === null || value === undefined) {
    return false
  }

  const text = String(value).trim()
  return Boolean(text) && text !== '---'
}

function parseNumericValue(value) {
  if (value === null || value === undefined) {
    return undefined
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '---') {
      return undefined
    }

    const normalized = trimmed.replace(/,/g, '')
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? undefined : parsed
  }

  return undefined
}

function findColumnIndexes(headers, labels) {
  const targetLabels = labels.map((label) => label.toLowerCase().trim())

  return headers.reduce((matches, header, index) => {
    if (targetLabels.includes(header.toLowerCase().trim())) {
      matches.push(index)
    }
    return matches
  }, [])
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getColumnIndex(headers, ...labels) {
  for (const label of labels) {
    const index = headers.findIndex((header) => (header || '').toString().trim().toLowerCase() === label.toLowerCase())
    if (index !== -1) {
      return index
    }
  }

  return -1
}

function getCellValue(row, index) {
  if (!Array.isArray(row) || index < 0) {
    return ''
  }

  const cell = row[index]

  if (typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') {
    return cell
  }

  if (cell && typeof cell === 'object') {
    return cell.v ?? ''
  }

  return ''
}

function classifyBlueprint(type, name) {
  const normalizedType = (type || '').toString().trim()
  const normalizedName = (name || '').toString().trim()
  const haystack = `${normalizedType} ${normalizedName}`.toLowerCase()
  const normalizedTypeKey = normalizeTypeKey(normalizedType)

  if (normalizedTypeKey === 'potion' && /herbal|remedy/.test(haystack)) {
    return { category: 'Accessories', type: 'Herbal Remedy' }
  }

  if (normalizedTypeKey === 'enchantment' || normalizedTypeKey === 'enchantments') {
    return { category: 'Enchantments', type: resolveEnchantmentType(normalizedName) }
  }

  const directMatch = CATEGORY_TYPE_LOOKUP.get(normalizedTypeKey)
  if (directMatch) {
    return directMatch
  }

  if (/enchant|spirit|element/i.test(haystack)) {
    return { category: 'Enchantments', type: resolveEnchantmentType(normalizedName) }
  }

  if (/sword|axe|dagger|mace|spear|bow|wand|staff|gun|crossbow|instrument|dual wield|catalyst|weapon/i.test(haystack)) {
    return { category: 'Weapons', type: resolveCanonicalType('Weapons', normalizedType, normalizedName) }
  }

  if (/herbal|potion|spell|shield|cloak|ring|amulet|familiar|idol|quiver|aura|meal|dessert|remedy|accessory/i.test(haystack)) {
    return { category: 'Accessories', type: resolveCanonicalType('Accessories', normalizedType, normalizedName) }
  }

  if (/armor|helmet|hat|glove|gauntlet|footwear|heavy armor|light armor|clothes|robe|boot|shoe/i.test(haystack)) {
    return { category: 'Armor', type: resolveCanonicalType('Armor', normalizedType, normalizedName) }
  }

  return { category: 'Accessories', type: resolveCanonicalType('Accessories', normalizedType, normalizedName) }
}

function normalizeTypeKey(value) {
  return (value || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function resolveEnchantmentType(name) {
  return /spirit/i.test(name) ? 'Spirit' : 'Element'
}

function resolveCanonicalType(category, type, name) {
  const haystack = `${type || ''} ${name || ''}`.toLowerCase()

  if (category === 'Weapons') {
    if (/dual\s*wield/.test(haystack)) return 'Dual Wield'
    if (/crossbow/.test(haystack)) return 'Crossbow'
    if (/instrument/.test(haystack)) return 'Instrument'
    if (/catalyst/.test(haystack)) return 'Catalyst'
    if (/sword/.test(haystack)) return 'Sword'
    if (/axe/.test(haystack)) return 'Axe'
    if (/dagger/.test(haystack)) return 'Dagger'
    if (/mace/.test(haystack)) return 'Mace'
    if (/spear/.test(haystack)) return 'Spear'
    if (/bow/.test(haystack)) return 'Bow'
    if (/wand/.test(haystack)) return 'Wand'
    if (/staff/.test(haystack)) return 'Staff'
    if (/gun/.test(haystack)) return 'Gun'
    return 'Sword'
  }

  if (category === 'Armor') {
    if (/heavy\s*armor|heavyarmor|plate|mail|cuirass/.test(haystack)) return 'Heavy Armor'
    if (/light\s*armor|lightarmor/.test(haystack)) return 'Light Armor'
    if (/clothes|robe/.test(haystack)) return 'Clothes'
    if (/rogue/.test(haystack)) return 'Rogue Hat'
    if (/magician|mage|wizard|sorcer/.test(haystack)) return 'Magician Hat'
    if (/helmet|helm/.test(haystack)) return 'Helmet'
    if (/gauntlet/.test(haystack)) return 'Gauntlets'
    if (/glove/.test(haystack)) return 'Gloves'
    if (/heavy\s*footwear|heavy\s*boot|heavy\s*shoe/.test(haystack)) return 'Heavy Footwear'
    if (/light\s*footwear|light\s*boot|light\s*shoe|footwear|boot|shoe/.test(haystack)) return 'Light Footwear'
    return 'Heavy Armor'
  }

  if (category === 'Accessories') {
    if (/herbal\s*remedy|herbal|remedy/.test(haystack)) return 'Herbal Remedy'
    if (/potion/.test(haystack)) return 'Potion'
    if (/spell/.test(haystack)) return 'Spell'
    if (/shield/.test(haystack)) return 'Shield'
    if (/cloak/.test(haystack)) return 'Cloak'
    if (/ring/.test(haystack)) return 'Ring'
    if (/amulet/.test(haystack)) return 'Amulet'
    if (/familiar/.test(haystack)) return 'Familiar'
    if (/aura\s*song|aurasong/.test(haystack)) return 'Aurasong'
    if (/quiver/.test(haystack)) return 'Quiver'
    if (/idol/.test(haystack)) return 'Idol'
    if (/meal/.test(haystack)) return 'Meal'
    if (/dessert/.test(haystack)) return 'Dessert'
    return 'Potion'
  }

  return type || 'Unknown'
}

function getCategoryIconName(category) {
  switch (category) {
    case 'Weapons':
      return 'Swords'
    case 'Armor':
      return 'Shield'
    case 'Accessories':
      return 'Gem'
    case 'Enchantments':
      return 'Sparkles'
    default:
      return 'CircleDashed'
  }
}

function getTypeIconName(type, category) {
  const haystack = `${type || ''}`.toLowerCase()

  if (/sword/.test(haystack)) return 'Sword'
  if (/axe/.test(haystack)) return 'Axe'
  if (/dagger|mace|spear/.test(haystack)) return 'Swords'
  if (/bow|crossbow/.test(haystack)) return 'BowArrow'
  if (/gun/.test(haystack)) return 'Crosshair'
  if (/wand/.test(haystack)) return 'Wand'
  if (/staff|catalyst/.test(haystack)) return 'WandSparkles'
  if (/instrument/.test(haystack)) return 'Music2'
  if (/dual wield/.test(haystack)) return 'Swords'
  if (/heavy armor|light armor/.test(haystack)) return 'Shield'
  if (/clothes/.test(haystack)) return 'Shirt'
  if (/helmet/.test(haystack)) return 'HardHat'
  if (/rogue hat/.test(haystack)) return 'HatGlasses'
  if (/magician hat/.test(haystack)) return 'Sparkles'
  if (/gauntlets/.test(haystack)) return 'HandMetal'
  if (/gloves/.test(haystack)) return 'Hand'
  if (/heavy footwear|light footwear/.test(haystack)) return 'Footprints'
  if (/herbal remedy/.test(haystack)) return 'Leaf'
  if (/potion/.test(haystack)) return 'PillBottle'
  if (/spell/.test(haystack)) return 'ScrollText'
  if (/shield/.test(haystack)) return 'Shield'
  if (/cloak/.test(haystack)) return 'Shirt'
  if (/ring/.test(haystack)) return 'Gem'
  if (/amulet/.test(haystack)) return 'Diamond'
  if (/familiar/.test(haystack)) return 'CircleDashed'
  if (/aurasong/.test(haystack)) return 'Music2'
  if (/quiver/.test(haystack)) return 'Target'
  if (/idol/.test(haystack)) return 'BadgeInfo'
  if (/meal/.test(haystack)) return 'UtensilsCrossed'
  if (/dessert/.test(haystack)) return 'CakeSlice'
  if (/element/.test(haystack)) return 'Sparkles'
  if (/spirit/.test(haystack)) return 'MoonStar'

  return getCategoryIconName(category)
}

function getBlueprintItemIconName(item) {
  return getTypeIconName(item?.classification?.type, item?.classification?.category)
}
