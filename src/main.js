import './style.css'
import { mountAdBanner } from './adBanner.js'
import { getRandomTavernText } from './kofiText.js'
import { useGoogleAuth } from './useGoogleAuth.js'
import { ensureUserSyncSpreadsheet, getGoogleSyncErrorMessage, parseWorkbookBlueprintProgress, readSyncTables, writeSyncTables } from './googleSheetSync.js'
import { pickFolderFromDrive, pickSpreadsheetFromDrive } from './googleDrivePicker.js'
import { getItem, setItem, removeItem } from './storage.js'
import { getBlueprintStageValue, getBlueprintStageOptions } from './blueprintStageOptions.js'
import { initSettingsUi, applyTheme as applySharedTheme, applyFontPreference as applySharedFontPreference, getStoredTheme as getSharedStoredTheme, getStoredFontPreference as getSharedStoredFontPreference } from './settingsUi.js'
import { SETTINGS_GEAR_ICON_MARKUP } from './settingsGearIcon.js'
import { escapeHtml, cleanText } from './textUtils.js'
import { createIcons, Axe, BadgeAlert, BadgeHelp, BadgeInfo, BowArrow, CakeSlice, CircleDashed, Crosshair, Diamond, Drumstick, FlaskConical, FlaskRound, Footprints, Gem, Hand, HandMetal, HardHat, HatGlasses, Leaf, MoonStar, Music2, PillBottle, Pizza, Salad, ScrollText, Shield, Shirt, Sparkles, Swords, Sword, Target, UtensilsCrossed, Wand, WandSparkles } from 'lucide'

const DEFAULT_SPREADSHEET_URL = 'https://playshoptitans.com/spreadsheet'
const FALLBACK_GOOGLE_SHEET_URL = import.meta.env.VITE_BLUEPRINT_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c/edit'
const GOOGLE_PICKER_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''

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
  mastered: 'any',
  collectionBookState: 'completed',
  collectionBook: [],
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
const BLUEPRINT_CACHE_STORAGE_KEY = 'shopkeeper-blueprint-cache-v1'
const GOOGLE_SYNC_SPREADSHEET_ID_STORAGE_KEY = 'shopkeeper-google-sync-spreadsheet-id'
const GOOGLE_SYNC_SPREADSHEET_ID_COOKIE_KEY = 'shopkeeper_google_sync_spreadsheet_id'
const GOOGLE_SYNC_WRITE_DEBOUNCE_MS = 900
const KOFI_HANDLE = 'shopkeepercompanion'
const KOFI_URL = 'https://ko-fi.com/shopkeepercompanion'

const LUCIDE_ICONS = {
  Axe,
  BadgeAlert,
  BadgeHelp,
  BadgeInfo,
  BowArrow,
  CakeSlice,
  CircleDashed,
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
  PillBottle,
  Pizza,
  Salad,
  ScrollText,
  Shield,
  Shirt,
  Sparkles,
  Swords,
  Sword,
  Target,
  UtensilsCrossed,
  Wand,
  WandSparkles,
}

app.innerHTML = `
  <div class="app-layout">
    <main class="importer-shell">
    <header class="app-header">
      <div class="hero-copy">
        <h1 class="hero-title">
          <span class="hero-title-text">Shopkeeper Companion</span>
          <span class="hero-title-split" aria-hidden="true">
            <span>Shopkeeper</span>
            <span>Companion</span>
          </span>
        </h1>
      </div>

      <nav class="top-tabs" aria-label="Primary">
        <button class="top-tab is-active" type="button" data-view="blueprints">Blueprints</button>
        <button class="top-tab" type="button" data-view="saved-views">Saved Views</button>
      </nav>

      <button id="settings-toggle" class="settings-toggle" type="button" aria-label="Open settings" aria-expanded="false" aria-controls="settings-panel">
        ${SETTINGS_GEAR_ICON_MARKUP}
      </button>
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
          <form id="import-form" class="import-form compact-form">
            <button type="submit">Import Blueprints</button>
            <p id="blueprint-version" class="settings-copy blueprint-version"></p>
          </form>
          <p class="settings-copy">Bring in the latest blueprint library from the developer spreadsheet whenever it needs a refresh.</p>
        </section>

        <section class="settings-section settings-section--inline">
          <h3>Theme</h3>
          <div class="theme-options">
            <label><input type="radio" name="theme" value="light" /> Light</label>
            <label><input type="radio" name="theme" value="dark" /> Dark</label>
            <label><input type="radio" name="theme" value="device" checked /> Device</label>
          </div>
        </section>

        <section class="settings-section settings-section--inline">
          <h3>Font</h3>
          <select id="font-select" class="font-select" aria-label="Font style">
            <option value="default">Aesthetic (Default)</option>
            <option value="sans">Century Gothic</option>
            <option value="serif">Times New Roman</option>
          </select>
        </section>

        <section class="settings-section">
          <h3>Sync your progress with Google Sheets</h3>
          <div id="google-auth" class="google-auth"></div>
          <details class="attribution-details advanced-sync-details">
            <summary>Why Google Sheets? <span class="advanced-sync-toggle-icon" aria-hidden="true">▶</span></summary>
            <p class="settings-copy">Your progress is stored in a Google Sheet named <strong>Shopkeeper Companion User Data</strong> in your Drive, so it's always yours and easy to back up or inspect.</p>
            <p class="settings-copy">As a bonus, you can edit values directly in the sheet, then hit <strong>Sync Now</strong> to bring those changes into the app.</p>
            <p class="settings-copy"><a class="inline-link" href="/bulk-edit.html" target="_blank" rel="noopener noreferrer">Read the full Google Sync guide</a></p>
          </details>
        </section>

        <section class="settings-section">
          <a id="kofi-support-button" class="kofi-support-button kofi-link-button" href="https://ko-fi.com/shopkeepercompanion" target="_blank" rel="noopener noreferrer">
            <img class="kofi-link-icon" src="https://storage.ko-fi.com/cdn/cup-border.png" alt="" aria-hidden="true" />
            <span class="kofi-link-text" data-kofi-button-text>Support on Ko-fi</span>
          </a>
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

        <p class="settings-privacy-link">
          <a class="inline-link settings-privacy-link-anchor" href="/privacy.html">Privacy Policy</a>
        </p>
      </div>
    </aside>
    </main>

    <aside class="desktop-ad-rail" aria-label="Sponsored content">
      <div id="desktop-ad-banner"></div>
    </aside>
  </div>

  <div class="mobile-ad-rail" aria-label="Sponsored content">
    <div id="mobile-ad-banner"></div>
  </div>
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
const blueprintVersionEl = document.querySelector('#blueprint-version')
const kofiSupportButtonEl = document.querySelector('#kofi-support-button')
const blueprintOverlay = document.querySelector('#blueprint-overlay')
const blueprintOverlayContent = document.querySelector('#blueprint-overlay-content')
const googleAuthContainer = document.querySelector('#google-auth')
const desktopAdBannerEl = document.querySelector('#desktop-ad-banner')
const mobileAdBannerEl = document.querySelector('#mobile-ad-banner')
const topTabs = Array.from(document.querySelectorAll('.top-tab'))
const viewPanels = Array.from(document.querySelectorAll('[data-view-panel]'))
let trackedUpgradeKeys = loadTrackedUpgradeKeys()

function activateView(viewName) {
  const normalizedViewName = viewName === 'saved-views' ? 'saved-views' : 'blueprints'
  const targetPanel = document.querySelector(`[data-view-panel="${normalizedViewName}"]`)
  const targetTab = document.querySelector(`[data-view="${normalizedViewName}"]`)

  if (!targetPanel || !targetTab) {
    return
  }

  topTabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab === targetTab)
  })

  viewPanels.forEach((panel) => {
    panel.classList.toggle('is-hidden', panel !== targetPanel)
  })

  if (normalizedViewName === 'saved-views') {
    window.location.hash = '#saved-views'
  } else {
    window.location.hash = '#blueprints'
  }
}
let blueprintProgressByName = loadBlueprintProgressMap()
let allBlueprintItems = []
let savedFilterViews = []
let hasLoadedSavedFilterViews = false
let savedViewCriteria = {
  ...DEFAULT_SAVED_VIEW_CRITERIA,
}
let activeSavedViewPreset = 'custom'
let savedViewDraftName = ''
let pendingGoogleSyncWriteTimer = null
let pendingGoogleSyncInitPromise = null
let isApplyingRemoteSyncState = false
let blueprintVersionLabel = ''
let disposeDesktopAd = () => {}
let disposeMobileAd = () => {}
const googleSyncState = {
  spreadsheetId: '',
  spreadsheetUrl: '',
  isReady: false,
  isSyncing: false,
  error: '',
  notice: '',
  lastSyncedAt: '',
  setupStep: 'idle',
  setupInput: '',
  setupError: '',
  selectedSpreadsheetId: '',
}
const googleAuth = useGoogleAuth({ clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID })

const { closeSettings } = initSettingsUi({
  settingsToggle,
  settingsPanel,
  closeSettingsButton,
  themeInputs,
  fontSelect,
  onThemeChange: (nextTheme) => applyTheme(nextTheme),
  onFontChange: (nextFont) => applyFontPreference(nextFont),
  onEscape: () => {
    if (blueprintOverlay.classList.contains('is-open')) {
      closeBlueprintOverlay()
    }
  },
})

topTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    activateView(tab.dataset.view)
  })
})

if (window.location.hash === '#saved-views') {
  activateView('saved-views')
} else {
  activateView('blueprints')
}

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#saved-views') {
    activateView('saved-views')
  } else {
    activateView('blueprints')
  }
})

applyTheme(getStoredTheme())
applyFontPreference(getStoredFontPreference())
initializeAdBanners()
initializeKofiSupportButton()

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  await importBlueprintData()
})

async function init() {
  await initializeBlueprintDataFromCache()
  await hydrateGoogleSyncSpreadsheetId()
  initializeGoogleAuthUi()
}

init()

function initializeGoogleAuthUi() {
  if (!googleAuthContainer) {
    return
  }

  renderGoogleAuthUi(googleAuth.getState())
  void handleGoogleAuthStateChange(googleAuth.getState())

  googleAuth.subscribe((state) => {
    renderGoogleAuthUi(state)
    void handleGoogleAuthStateChange(state)
  })
}

function initializeAdBanners() {
  disposeDesktopAd()
  disposeMobileAd()

  disposeDesktopAd = mountAdBanner(desktopAdBannerEl, {
    publisher: KOFI_HANDLE,
    kofiUrl: KOFI_URL,
  })

  disposeMobileAd = mountAdBanner(mobileAdBannerEl, {
    publisher: KOFI_HANDLE,
    kofiUrl: KOFI_URL,
  })
}

function initializeKofiSupportButton() {
  if (!kofiSupportButtonEl) {
    return
  }

  const textEl = kofiSupportButtonEl.querySelector('[data-kofi-button-text]')
  if (textEl) {
    textEl.textContent = getRandomTavernText()
  }
}

function renderGoogleAuthUi(state) {
  if (!googleAuthContainer) {
    return
  }

  const signOutDisabled = state.isLoading || state.isAuthenticating || !state.isAuthenticated

  if (state.isAuthenticated) {
    const isSetupStep = googleSyncState.setupStep === 'choose-source' || googleSyncState.setupStep === 'enter-existing'
    if (isSetupStep) {
      const setupPrompt = googleSyncState.setupStep === 'choose-source'
        ? 'Choose where to connect your Shopkeeper Companion sync sheet from Google Drive.'
        : 'Paste your Google Sheet share link or file ID to connect your existing sync sheet.'

      const setupInputMarkup = googleSyncState.setupStep === 'enter-existing'
        ? `
          <input
            type="text"
            class="google-sheet-input"
            data-auth-sheet-input
            placeholder="https://docs.google.com/spreadsheets/d/... or file ID"
            value="${escapeHtml(googleSyncState.setupInput)}"
          />
          <div class="auth-controls">
            <button type="button" class="auth-button" data-auth-action="connect-existing">Connect Existing Sheet</button>
            <button type="button" class="auth-button auth-button-secondary" data-auth-action="back-to-choice">Back</button>
          </div>
        `
        : `
          <div class="auth-controls">
            <button type="button" class="auth-button" data-auth-action="pick-existing-sheet">Pick existing sheet</button>
            <button type="button" class="auth-button auth-button-secondary" data-auth-action="enter-existing">Paste share link / file ID</button>
            <button type="button" class="auth-button" data-auth-action="create-new-sheet">Create new sheet</button>
            <button type="button" class="auth-button auth-button-secondary" data-auth-action="create-new-in-folder">Create new sheet in chosen folder</button>
          </div>
        `

      googleAuthContainer.innerHTML = `
        <p class="settings-copy sync-caption">${escapeHtml(setupPrompt)}</p>
        ${setupInputMarkup}
        ${googleSyncState.setupError ? `<p class="settings-copy sync-caption sync-error">${escapeHtml(googleSyncState.setupError)}</p>` : ''}
        ${googleSyncState.error ? `<p class="settings-copy sync-caption sync-error">${escapeHtml(googleSyncState.error)}</p>` : ''}
        <div class="auth-controls">
          <button type="button" class="auth-button auth-button-secondary" data-auth-action="sign-out" ${signOutDisabled ? 'disabled' : ''}>Sign Out</button>
        </div>
      `

      const sheetInput = googleAuthContainer.querySelector('[data-auth-sheet-input]')
      sheetInput?.addEventListener('input', (event) => {
        googleSyncState.setupInput = event.target.value || ''
      })

      const enterExistingButton = googleAuthContainer.querySelector('[data-auth-action="enter-existing"]')
      enterExistingButton?.addEventListener('click', () => {
        googleSyncState.setupStep = 'enter-existing'
        googleSyncState.setupError = ''
        renderGoogleAuthUi(googleAuth.getState())
      })

      const pickExistingSheetButton = googleAuthContainer.querySelector('[data-auth-action="pick-existing-sheet"]')
      pickExistingSheetButton?.addEventListener('click', async () => {
        try {
          googleSyncState.setupError = ''
          googleSyncState.isSyncing = true
          renderGoogleAuthUi(googleAuth.getState())

          const pickedSheet = await pickSpreadsheetFromDrive({
            accessToken: state.accessToken,
            developerKey: GOOGLE_PICKER_API_KEY,
          })

          if (!pickedSheet?.id) {
            return
          }

          googleSyncState.selectedSpreadsheetId = pickedSheet.id
          await persistGoogleSyncSpreadsheetId(pickedSheet.id)
          googleSyncState.setupStep = 'idle'
          renderGoogleAuthUi(googleAuth.getState())
          await initializeGoogleSync(state.accessToken, { preferredSpreadsheetId: pickedSheet.id, reason: 'recovery' })
        } catch (error) {
          googleSyncState.setupError = error?.message || 'Unable to open Google Drive Picker right now.'
        } finally {
          googleSyncState.isSyncing = false
          renderGoogleAuthUi(googleAuth.getState())
        }
      })

      const backToChoiceButton = googleAuthContainer.querySelector('[data-auth-action="back-to-choice"]')
      backToChoiceButton?.addEventListener('click', () => {
        googleSyncState.setupStep = 'choose-source'
        googleSyncState.setupError = ''
        renderGoogleAuthUi(googleAuth.getState())
      })

      const connectExistingButton = googleAuthContainer.querySelector('[data-auth-action="connect-existing"]')
      connectExistingButton?.addEventListener('click', async () => {
        const spreadsheetId = parseSpreadsheetIdFromInput(googleSyncState.setupInput)
        if (!spreadsheetId) {
          googleSyncState.setupError = 'Please paste a valid Google Sheet share link or spreadsheet file ID.'
          renderGoogleAuthUi(googleAuth.getState())
          return
        }

        googleSyncState.setupError = ''
        googleSyncState.selectedSpreadsheetId = spreadsheetId
        await persistGoogleSyncSpreadsheetId(spreadsheetId)
        googleSyncState.setupStep = 'idle'
        renderGoogleAuthUi(googleAuth.getState())
        await initializeGoogleSync(state.accessToken, { preferredSpreadsheetId: spreadsheetId, reason: 'recovery' })
      })

      const createNewSheetButton = googleAuthContainer.querySelector('[data-auth-action="create-new-sheet"]')
      createNewSheetButton?.addEventListener('click', async () => {
        googleSyncState.setupError = ''
        googleSyncState.selectedSpreadsheetId = ''
        googleSyncState.setupStep = 'idle'
        renderGoogleAuthUi(googleAuth.getState())
        await initializeGoogleSync(state.accessToken, { preferredSpreadsheetId: '', reason: 'new-user' })
      })

      const createNewInFolderButton = googleAuthContainer.querySelector('[data-auth-action="create-new-in-folder"]')
      createNewInFolderButton?.addEventListener('click', async () => {
        try {
          googleSyncState.setupError = ''
          googleSyncState.isSyncing = true
          renderGoogleAuthUi(googleAuth.getState())

          const pickedFolder = await pickFolderFromDrive({
            accessToken: state.accessToken,
            developerKey: GOOGLE_PICKER_API_KEY,
          })

          if (!pickedFolder?.id) {
            return
          }

          googleSyncState.selectedSpreadsheetId = ''
          googleSyncState.setupStep = 'idle'
          renderGoogleAuthUi(googleAuth.getState())
          await initializeGoogleSync(state.accessToken, {
            preferredSpreadsheetId: '',
            reason: 'new-user',
            targetFolderId: pickedFolder.id,
          })
        } catch (error) {
          googleSyncState.setupError = error?.message || 'Unable to open Google Drive folder picker right now.'
        } finally {
          googleSyncState.isSyncing = false
          renderGoogleAuthUi(googleAuth.getState())
        }
      })

      const signOutButton = googleAuthContainer.querySelector('[data-auth-action="sign-out"]')
      signOutButton?.addEventListener('click', async () => {
        await googleAuth.signOut()
      })

      return
    }

    const syncLabel = googleSyncState.lastSyncedAt
      ? `Last sync: ${new Date(googleSyncState.lastSyncedAt).toLocaleString()}`
      : 'Connected. Ready to sync.'
    const syncDisabled = googleSyncState.isSyncing || !googleSyncState.isReady

    googleAuthContainer.innerHTML = `
      <div class="auth-controls">
        <button type="button" class="auth-button" data-auth-action="sync-now" ${syncDisabled ? 'disabled' : ''}>${googleSyncState.isSyncing ? 'Syncing…' : 'Sync Now'}</button>
        <button type="button" class="auth-button auth-button-secondary" data-auth-action="change-sync-sheet" ${googleSyncState.isSyncing ? 'disabled' : ''}>Change Sync Sheet</button>
        <button type="button" class="auth-button auth-button-secondary" data-auth-action="sign-out" ${signOutDisabled ? 'disabled' : ''}>Sign Out</button>
      </div>
      <p class="settings-copy sync-caption">${escapeHtml(syncLabel)}</p>
      ${googleSyncState.notice ? `<p class="settings-copy sync-caption">${escapeHtml(googleSyncState.notice)}</p>` : ''}
      ${googleSyncState.error ? `<p class="settings-copy sync-caption sync-error">${escapeHtml(googleSyncState.error)}</p>` : ''}
    `

    const syncNowButton = googleAuthContainer.querySelector('[data-auth-action="sync-now"]')
    syncNowButton?.addEventListener('click', async () => {
      await syncFromGoogleSheet()
    })

    const changeSyncSheetButton = googleAuthContainer.querySelector('[data-auth-action="change-sync-sheet"]')
    changeSyncSheetButton?.addEventListener('click', () => {
      googleSyncState.setupStep = 'choose-source'
      googleSyncState.setupInput = ''
      googleSyncState.setupError = ''
      renderGoogleAuthUi(googleAuth.getState())
    })

    const signOutButton = googleAuthContainer.querySelector('[data-auth-action="sign-out"]')
    signOutButton?.addEventListener('click', async () => {
      await googleAuth.signOut()
    })
    return
  }

  googleAuthContainer.innerHTML = '<div class="google-signin-slot" data-auth-signin-slot></div>'
  const signInSlot = googleAuthContainer.querySelector('[data-auth-signin-slot]')
  const renderedGoogleButton = googleAuth.renderSignInButton(signInSlot)
  const authMessage = state.error ? `<p class="settings-copy sync-caption sync-error">${escapeHtml(state.error)}</p>` : ''

  if (!renderedGoogleButton) {
    const isDisabled = state.isAuthenticating || state.clientIdMissing
    googleAuthContainer.innerHTML = `<button type="button" class="auth-button" data-auth-action="sign-in" ${isDisabled ? 'disabled' : ''}>Sign in with Google</button>${authMessage}`
    const signInButton = googleAuthContainer.querySelector('[data-auth-action="sign-in"]')
    signInButton?.addEventListener('click', async () => {
      await googleAuth.signIn()
    })
  } else if (authMessage) {
    googleAuthContainer.insertAdjacentHTML('beforeend', authMessage)
  }
}

async function handleGoogleAuthStateChange(state) {
  if (!state?.isAuthenticated || !state?.accessToken) {
    googleSyncState.isReady = false
    googleSyncState.error = ''
    googleSyncState.notice = ''
    googleSyncState.isSyncing = false
    googleSyncState.setupStep = 'idle'
    googleSyncState.setupInput = ''
    googleSyncState.setupError = ''
    googleSyncState.selectedSpreadsheetId = ''
    pendingGoogleSyncInitPromise = null
    renderGoogleAuthUi(state)
    return
  }

  if (!googleSyncState.isReady && !googleSyncState.isSyncing && !googleSyncState.spreadsheetId && googleSyncState.setupStep === 'idle') {
    googleSyncState.setupStep = 'choose-source'
    googleSyncState.setupError = ''
    renderGoogleAuthUi(state)
    return
  }

  if (googleSyncState.setupStep === 'choose-source' || googleSyncState.setupStep === 'enter-existing') {
    return
  }

  if (!googleSyncState.isReady && !googleSyncState.isSyncing) {
    await initializeGoogleSync(state.accessToken, {
      preferredSpreadsheetId: googleSyncState.selectedSpreadsheetId || googleSyncState.spreadsheetId,
      reason: googleSyncState.selectedSpreadsheetId || googleSyncState.spreadsheetId ? 'recovery' : 'new-user',
    })
  }
}

async function initializeGoogleSync(accessToken, options = {}) {
  if (pendingGoogleSyncInitPromise) {
    await pendingGoogleSyncInitPromise
    return
  }

  const preferredSpreadsheetId = typeof options?.preferredSpreadsheetId === 'string'
    ? options.preferredSpreadsheetId.trim()
    : googleSyncState.spreadsheetId
  const syncReason = options?.reason === 'recovery'
    ? 'recovery'
    : preferredSpreadsheetId
      ? 'recovery'
      : 'new-user'
  const targetFolderId = typeof options?.targetFolderId === 'string'
    ? options.targetFolderId.trim()
    : ''

  pendingGoogleSyncInitPromise = (async () => {
    try {
      googleSyncState.isSyncing = true
      googleSyncState.error = ''
      googleSyncState.notice = ''
      renderGoogleAuthUi(googleAuth.getState())

      const ensured = await ensureUserSyncSpreadsheet(accessToken, preferredSpreadsheetId, {
        reason: syncReason,
        targetFolderId,
        confirmCreate: async (message) => {
          googleSyncState.notice = message
          renderGoogleAuthUi(googleAuth.getState())
          return window.confirm(message)
        },
      })
      googleSyncState.spreadsheetId = ensured.spreadsheetId
      googleSyncState.spreadsheetUrl = ensured.spreadsheetUrl
      await persistGoogleSyncSpreadsheetId(ensured.spreadsheetId)

      const remote = await readSyncTables(accessToken, ensured.spreadsheetId)
      if (hasRemoteSyncData(remote)) {
        applyRemoteSyncState(remote)
      } else if (hasLocalUserData() || allBlueprintItems.length) {
        await pushLocalStateToGoogleSheet(accessToken)
      }

      googleSyncState.isReady = true
      googleSyncState.notice = ''
      googleSyncState.lastSyncedAt = new Date().toISOString()
      renderGoogleAuthUi(googleAuth.getState())
    } catch (error) {
      googleSyncState.error = getGoogleSyncErrorMessage(error)
      googleSyncState.notice = ''
      googleSyncState.isReady = false
      googleSyncState.spreadsheetId = ''
      googleSyncState.spreadsheetUrl = ''
      await clearStoredGoogleSyncSpreadsheetId()
      console.error(error)
      renderGoogleAuthUi(googleAuth.getState())
    } finally {
      googleSyncState.isSyncing = false
      renderGoogleAuthUi(googleAuth.getState())
    }
  })()

  try {
    await pendingGoogleSyncInitPromise
  } finally {
    pendingGoogleSyncInitPromise = null
  }
}

function parseSpreadsheetIdFromInput(rawValue = '') {
  const value = String(rawValue || '').trim()
  if (!value) {
    return ''
  }

  const idMatch = value.match(/[-\w]{25,}/)
  if (!idMatch) {
    return ''
  }

  if (/^https?:\/\//i.test(value)) {
    const fromPath = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (fromPath?.[1]) {
      return fromPath[1]
    }
  }

  return idMatch[0]
}

async function hydrateGoogleSyncSpreadsheetId() {
  const cookieValue = readCookieValue(GOOGLE_SYNC_SPREADSHEET_ID_COOKIE_KEY)
  let storedValue = ''

  try {
    storedValue = String(await getItem(GOOGLE_SYNC_SPREADSHEET_ID_STORAGE_KEY) || '').trim()
  } catch (error) {
    console.warn('Unable to read Google sync spreadsheet ID from IndexedDB.', error)
  }

  if (storedValue) {
    googleSyncState.spreadsheetId = storedValue
    if (cookieValue !== storedValue) {
      writeCookieValue(GOOGLE_SYNC_SPREADSHEET_ID_COOKIE_KEY, storedValue)
    }
    return
  }

  if (cookieValue) {
    googleSyncState.spreadsheetId = cookieValue
    try {
      await setItem(GOOGLE_SYNC_SPREADSHEET_ID_STORAGE_KEY, cookieValue)
    } catch (error) {
      console.warn('Unable to write Google sync spreadsheet ID to IndexedDB.', error)
    }
    return
  }

  googleSyncState.spreadsheetId = ''
}

async function persistGoogleSyncSpreadsheetId(spreadsheetId = '') {
  const normalizedId = String(spreadsheetId || '').trim()
  if (!normalizedId) {
    await clearStoredGoogleSyncSpreadsheetId()
    return
  }

  try {
    await setItem(GOOGLE_SYNC_SPREADSHEET_ID_STORAGE_KEY, normalizedId)
  } catch (error) {
    console.warn('Unable to write Google sync spreadsheet ID to IndexedDB.', error)
  }

  writeCookieValue(GOOGLE_SYNC_SPREADSHEET_ID_COOKIE_KEY, normalizedId)
}

async function clearStoredGoogleSyncSpreadsheetId() {
  try {
    await removeItem(GOOGLE_SYNC_SPREADSHEET_ID_STORAGE_KEY)
  } catch (error) {
    console.warn('Unable to clear Google sync spreadsheet ID from IndexedDB.', error)
  }

  clearCookieValue(GOOGLE_SYNC_SPREADSHEET_ID_COOKIE_KEY)
}

function readCookieValue(name) {
  const encodedName = encodeURIComponent(String(name || '').trim())
  if (!encodedName) {
    return ''
  }

  const entries = String(document.cookie || '').split(';')
  for (const entry of entries) {
    const [rawKey, ...rawValueParts] = entry.trim().split('=')
    if (rawKey === encodedName) {
      return decodeURIComponent(rawValueParts.join('=') || '')
    }
  }

  return ''
}

function writeCookieValue(name, value, maxAgeDays = 3650) {
  const encodedName = encodeURIComponent(String(name || '').trim())
  if (!encodedName) {
    return
  }

  const encodedValue = encodeURIComponent(String(value || '').trim())
  const maxAgeSeconds = Math.max(0, Number(maxAgeDays) || 0) * 24 * 60 * 60
  const secureSegment = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${encodedName}=${encodedValue}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secureSegment}`
}

function clearCookieValue(name) {
  const encodedName = encodeURIComponent(String(name || '').trim())
  if (!encodedName) {
    return
  }

  const secureSegment = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${encodedName}=; Path=/; Max-Age=0; SameSite=Lax${secureSegment}`
}

async function syncFromGoogleSheet() {
  const authState = googleAuth.getState()
  if (!authState?.isAuthenticated || !authState?.accessToken) {
    return
  }

  try {
    if (!googleSyncState.isReady || !googleSyncState.spreadsheetId) {
      await initializeGoogleSync(authState.accessToken)
    }

    if (!googleSyncState.spreadsheetId) {
      throw new Error('Google Sync Sheet is not connected yet.')
    }

    googleSyncState.isSyncing = true
    googleSyncState.error = ''
    googleSyncState.notice = ''
    renderGoogleAuthUi(authState)

    const remote = await readSyncTables(authState.accessToken, googleSyncState.spreadsheetId)
    applyRemoteSyncState(remote)
    googleSyncState.lastSyncedAt = new Date().toISOString()
    renderGoogleAuthUi(googleAuth.getState())
    updateStatus('Synced user data from Google Sheet.', 'info')
  } catch (error) {
    googleSyncState.error = getGoogleSyncErrorMessage(error)
    renderGoogleAuthUi(googleAuth.getState())
    console.error(error)
  } finally {
    googleSyncState.isSyncing = false
    renderGoogleAuthUi(googleAuth.getState())
  }
}

function hasRemoteSyncData(remote) {
  if (!remote || typeof remote !== 'object') {
    return false
  }

  const hasSettingsRows = Array.isArray(remote.settings) && remote.settings.length > 0
  const hasSavedViewsRows = Array.isArray(remote.savedViews) && remote.savedViews.length > 0
  const hasBlueprintRows = hasWorkbookBlueprintRows(remote.blueprintProgress)

  return hasSettingsRows || hasSavedViewsRows || hasBlueprintRows
}

function hasWorkbookBlueprintRows(blueprintProgressBySheet) {
  if (!blueprintProgressBySheet || typeof blueprintProgressBySheet !== 'object' || Array.isArray(blueprintProgressBySheet)) {
    return false
  }

  return Object.values(blueprintProgressBySheet).some((sheetRows) => {
    if (!Array.isArray(sheetRows) || sheetRows.length <= 1) {
      return false
    }

    return sheetRows.slice(1).some((row) => {
      if (!Array.isArray(row)) {
        return false
      }

      return row.some((cell) => String(cell ?? '').trim() !== '')
    })
  })
}

function hasLocalUserData() {
  return (
    Boolean(allBlueprintItems.length) ||
    Boolean(savedFilterViews.length) ||
    Boolean(trackedUpgradeKeys.size) ||
    Boolean(Object.keys(blueprintProgressByName).length) ||
    Boolean(localStorage.getItem(FONT_PREFERENCE_STORAGE_KEY)) ||
    Boolean(localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY))
  )
}

function applyRemoteSyncState(remoteTables) {
  isApplyingRemoteSyncState = true

  try {
    const settings = parseSettingsRows(remoteTables.settings)
    const nextTheme = settings.theme
    const nextFont = settings.font
    if (nextTheme) {
      applyTheme(nextTheme, { skipSync: true })
    }
    if (nextFont) {
      applyFontPreference(nextFont, { skipSync: true })
    }

    savedFilterViews = parseSavedViewsRows(remoteTables.savedViews)
    hasLoadedSavedFilterViews = true
    localStorage.setItem(SAVED_FILTER_VIEWS_STORAGE_KEY, JSON.stringify(savedFilterViews))

    trackedUpgradeKeys = new Set(parseTrackedUpgradeRows(settings))
    localStorage.setItem(TRACKED_UPGRADES_STORAGE_KEY, JSON.stringify([...trackedUpgradeKeys]))

    blueprintProgressByName = parseBlueprintProgressRows(remoteTables.blueprintProgress, blueprintProgressByName)
    localStorage.setItem(BLUEPRINT_PROGRESS_STORAGE_KEY, JSON.stringify(blueprintProgressByName))
  } finally {
    isApplyingRemoteSyncState = false
  }

  if (allBlueprintItems.length) {
    renderSavedViews(allBlueprintItems)
  }
}

function scheduleGoogleSyncWrite() {
  if (isApplyingRemoteSyncState) {
    return
  }

  const authState = googleAuth.getState()
  if (!authState?.isAuthenticated || !authState?.accessToken) {
    return
  }

  if (!googleSyncState.isReady || !googleSyncState.spreadsheetId) {
    return
  }

  if (pendingGoogleSyncWriteTimer) {
    window.clearTimeout(pendingGoogleSyncWriteTimer)
  }

  pendingGoogleSyncWriteTimer = window.setTimeout(() => {
    pendingGoogleSyncWriteTimer = null
    void pushLocalStateToGoogleSheet(authState.accessToken)
  }, GOOGLE_SYNC_WRITE_DEBOUNCE_MS)
}

async function pushLocalStateToGoogleSheet(accessToken) {
  if (!googleSyncState.spreadsheetId) {
    return
  }

  try {
    googleSyncState.isSyncing = true
    googleSyncState.error = ''
    renderGoogleAuthUi(googleAuth.getState())

    await writeSyncTables(accessToken, googleSyncState.spreadsheetId, {
      settings: buildSettingsRows(),
      savedViews: buildSavedViewsRows(),
      blueprintItems: allBlueprintItems,
      blueprintProgressByName,
    })

    googleSyncState.lastSyncedAt = new Date().toISOString()
  } catch (error) {
    googleSyncState.error = getGoogleSyncErrorMessage(error)
    console.error(error)
  } finally {
    googleSyncState.isSyncing = false
    renderGoogleAuthUi(googleAuth.getState())
  }
}

function buildSettingsRows() {
  return [
    ['theme', getStoredTheme()],
    ['font', getStoredFontPreference()],
    ['tracked-upgrades', JSON.stringify([...trackedUpgradeKeys])],
  ]
}

function buildSavedViewsRows() {
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

function parseSettingsRows(rows = []) {
  return rows.reduce((result, row) => {
    const key = cleanText(row?.[0]).toLowerCase()
    const value = cleanText(row?.[1])
    if (key && value) {
      result[key] = value
    }
    return result
  }, {})
}

function parseSavedViewsRows(rows = []) {
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
        criteria: {
          dependency: cleanText(row?.[2]) || 'any',
          ownership: cleanText(row?.[3]) || 'any',
          inventory: cleanText(row?.[4]) || 'any',
          mastered: cleanText(row?.[5]) || 'any',
          collectionBook: parseCollectionBookCriteria(row?.[6]),
        },
      }
    })
    .filter(Boolean)
}

function parseCollectionBookCriteria(value) {
  const raw = cleanText(value)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return raw.split(',').map((entry) => cleanText(entry.toLowerCase())).filter(Boolean)
  }
}

function parseTrackedUpgradeRows(settings = {}) {
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    const raw = cleanText(settings['tracked-upgrades'] || settings['trackedUpgrades'])
    if (!raw) {
      return []
    }

    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      return []
    }
  }

  return []
}

function parseBlueprintProgressRows(rows = [], existingProgress = {}) {
  return parseWorkbookBlueprintProgress(rows, existingProgress)
}

function updateStatus(message, tone = 'info') {
  statusEl.textContent = message
  statusEl.className = `status ${tone}`
}

async function importBlueprintData() {
  try {
    updateStatus('Checking the latest Shop Titans spreadsheet link…')
    const resolvedUrl = await resolveSpreadsheetUrl(DEFAULT_SPREADSHEET_URL)
    const exportUrl = buildExportUrl(resolvedUrl)
    const versionLabel = await fetchSpreadsheetVersionLabel(resolvedUrl)

    updateStatus('Downloading blueprints…')
    const { headers, rows, structuredBlueprints } = await importGoogleSheet(exportUrl)
    blueprintVersionLabel = versionLabel || blueprintVersionLabel
    await saveBlueprintCache({ headers, structuredBlueprints, versionLabel: blueprintVersionLabel })
    allBlueprintItems = buildBlueprintItems(headers, rows, structuredBlueprints)
    renderBlueprintVersionLabel(blueprintVersionLabel)

    renderPreview(headers, rows, structuredBlueprints)
    renderSavedViews(allBlueprintItems)
    scheduleGoogleSyncWrite()
    updateStatus(`Blueprints downloaded (${allBlueprintItems.length} items).`, 'info')
    closeSettings()
  } catch (error) {
    console.error(error)
    updateStatus(error.message || 'The spreadsheet could not be imported.', 'error')
    renderBlueprintEmptyState('The blueprint library could not be imported. Please try again in a moment.')
  }
}

async function initializeBlueprintDataFromCache() {
  const cached = await loadBlueprintCache()
  blueprintVersionLabel = cached?.versionLabel || ''
  renderBlueprintVersionLabel(blueprintVersionLabel)

  if (!cached) {
    updateStatus('', 'info')
    renderBlueprintEmptyState('No blueprint library loaded yet. Click "Import Blueprints" in Settings to get the library back into the app.')
    return
  }

  const { headers = [], structuredBlueprints = [] } = cached
  allBlueprintItems = buildBlueprintItems(headers, [], structuredBlueprints)
  renderPreview(headers, [], structuredBlueprints)
  renderSavedViews(allBlueprintItems)
  scheduleGoogleSyncWrite()
  updateStatus('', 'info')
}

async function saveBlueprintCache(payload) {
  const safePayload = {
    headers: Array.isArray(payload?.headers) ? payload.headers : [],
    structuredBlueprints: Array.isArray(payload?.structuredBlueprints) ? payload.structuredBlueprints : [],
    versionLabel: typeof payload?.versionLabel === 'string' ? payload.versionLabel : '',
  }

  await setItem(BLUEPRINT_CACHE_STORAGE_KEY, safePayload)
}

function renderBlueprintVersionLabel(versionLabel) {
  if (!blueprintVersionEl) {
    return
  }

  if (!versionLabel) {
    blueprintVersionEl.innerHTML = ''
    blueprintVersionEl.hidden = true
    return
  }

  blueprintVersionEl.hidden = false
  blueprintVersionEl.innerHTML = `<strong>${escapeHtml(versionLabel)}</strong>`
}

function renderBlueprintEmptyState(message = 'No blueprint data available yet.') {
  if (previewEl) {
    previewEl.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`
  }

  if (savedViewsContentEl) {
    savedViewsContentEl.innerHTML = `<p class="empty-state">${escapeHtml(message)}</p>`
  }
}

async function fetchSpreadsheetVersionLabel(resolvedUrl) {
  try {
    // Fetching docs.google.com directly from the browser is blocked by CORS, so route through the dev proxy.
    const requestUrl = import.meta.env.DEV
      ? `/api/spreadsheet?url=${encodeURIComponent(resolvedUrl)}`
      : resolvedUrl
    const response = await fetch(requestUrl, { redirect: 'follow' })
    if (!response.ok) {
      return ''
    }

    const html = await response.text()
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
    const title = titleMatch?.[1]?.trim() || ''
    return extractSpreadsheetVersionLabel(title)
  } catch (error) {
    console.warn('Unable to read spreadsheet title.', error)
    return ''
  }
}

function extractSpreadsheetVersionLabel(title) {
  const normalizedTitle = String(title || '').trim()
  if (!normalizedTitle) {
    return ''
  }

  const versionMatch = normalizedTitle.match(/\|\s*c:\s*(.+?)(?:\s*-\s*Google Sheets)?$/i)
  if (versionMatch?.[1]) {
    return versionMatch[1].trim()
  }

  const parts = normalizedTitle.split('|')
  if (parts.length > 1) {
    return parts[parts.length - 1].trim().replace(/\s*-\s*Google Sheets$/i, '')
  }

  return normalizedTitle.replace(/\s*-\s*Google Sheets$/i, '')
}

async function loadBlueprintCache() {
  try {
    const cached = await getItem(BLUEPRINT_CACHE_STORAGE_KEY)
    if (!cached || typeof cached !== 'object') {
      // Check legacy localStorage cache
      const legacy = JSON.parse(localStorage.getItem(BLUEPRINT_CACHE_STORAGE_KEY) || 'null')
      if (legacy) {
        localStorage.removeItem(BLUEPRINT_CACHE_STORAGE_KEY)
        await saveBlueprintCache(legacy)
        return legacy
      }
      return null
    }

    if (!Array.isArray(cached.headers) || !Array.isArray(cached.structuredBlueprints)) {
      return null
    }

    return cached
  } catch (error) {
    console.warn('Unable to read blueprint cache.', error)
    return null
  }
}

function renderOverlaySectionCard(title, bodyMarkup, { hint = '', headerExtra = '', isOpen = true, cardClass = '' } = {}) {
  // Each overlay card uses the same wrapper so the sections stay consistent while staying easy to tweak.
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

function bindBlueprintOverlayInteractions(item) {
  // Keep the overlay controls wired in one place so the same blueprint can be refreshed after each edit.
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

  blueprintOverlayContent.querySelectorAll('.upgrade-stage-select').forEach((select) => {
    select.addEventListener('change', (event) => {
      const target = event.currentTarget
      persistBlueprintStage(item.name, target.dataset.stageKey, Number(target.value))
      openBlueprintOverlay(item)
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
}

function openBlueprintOverlay(item) {
  // This is the main blueprint detail view. It gathers the blueprint state and then builds the cards from smaller helpers.
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
  const upgradesMarkup = renderUpgradeSection(structuredData.upgrades, item.name, progress, owned)
  const inventoryMarkup = renderInventorySection(progress)
  const collectionMarkup = renderCollectionSection(progress, owned)

  const headerMarkup = `
    <div class="overlay-top-layout">
      <div class="overlay-hero">
        <div class="overlay-hero-background overlay-hero-symbol" aria-hidden="true">
          <span class="icon-slot overlay-hero-icon"><i data-lucide="${escapeHtml(getCategoryIconName(visuals.category))}"></i></span>
        </div>
        <div class="overlay-hero-content">
          <div class="overlay-visual-strip" aria-hidden="true">
            <div class="overlay-visual-tile overlay-visual-category">
              <span class="icon-slot overlay-visual-icon"><i data-lucide="${escapeHtml(getCategoryIconName(visuals.category))}"></i></span>
            </div>
            <div class="overlay-visual-tile overlay-visual-item">
              <span class="icon-slot overlay-item-icon"><i data-lucide="${escapeHtml(getBlueprintItemIconName(item))}"></i></span>
            </div>
          </div>
          <div class="overlay-title-block">
            <p class="overlay-eyebrow">${escapeHtml(visuals.category)} / ${escapeHtml(visuals.type || 'Blueprint')}</p>
            <h3 id="blueprint-overlay-title">${escapeHtml(item.name)}</h3>
            <div class="overlay-meta-row">
              <span class="overlay-tier-badge">Tier ${escapeHtml(tierValue)}</span>
              <span class="overlay-group-badge">${escapeHtml(visuals.category)}</span>
            </div>
          </div>
          <label class="owned-toggle overlay-owned-toggle">
            <input class="tracking-checkbox owned-checkbox" type="checkbox" data-blueprint-name="${escapeHtml(item.name)}" ${owned ? 'checked' : ''} />
            <span>Owned</span>
          </label>
        </div>
      </div>
    </div>
  `

  const overviewCardsMarkup = `
    <div class="overlay-top-panels">
      ${renderOverlaySectionCard('Quick look', `<ul class="info-list">
        <li><strong>Status</strong> ${owned ? 'Owned' : 'Not owned'}</li>
        <li><strong>Total inventory</strong> ${escapeHtml(totalInventory)}</li>
        <li><strong>Collection</strong> ${escapeHtml(collectionStatus || 'Not started')}</li>
        <li><strong>Unlock requirement</strong> ${escapeHtml(unlockPrerequisite || '—')}</li>
      </ul>`, {
        cardClass: 'overlay-card-quick-look',
      })}
      ${renderOverlaySectionCard('Stats', `<div class="info-grid">${statsMarkup}</div>`, {
        cardClass: 'overlay-card-stats',
      })}
      ${renderOverlaySectionCard('Materials', `<div class="material-grid">${materialsMarkup}</div>`, {
        cardClass: 'overlay-card-materials',
      })}
    </div>
  `

  const detailCardsMarkup = [
    renderOverlaySectionCard('Inventory', `<div class="inventory-grid">${inventoryMarkup}</div>`, {
      hint: 'Counts',
    }),
    renderOverlaySectionCard('Unlockable upgrades', `<div class="upgrade-grid">${upgradesMarkup}</div>`, {
      hint: owned ? 'Unlocked' : 'Check Owned to Unlock',
    }),
    renderOverlaySectionCard('Collection Book', `<div class="collection-grid">${collectionMarkup}</div>`, {
      hint: owned ? 'Track qualities' : 'Mark blueprint as Owned first',
    }),
  ].join('')

  blueprintOverlayContent.innerHTML = `${headerMarkup}${overviewCardsMarkup}${detailCardsMarkup}`

  renderLucideIcons(blueprintOverlayContent)
  bindBlueprintOverlayInteractions(item)

  blueprintOverlay.classList.add('is-open')
  blueprintOverlay.setAttribute('aria-hidden', 'false')
  document.body.classList.add('blueprint-overlay-open')
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

function renderUpgradeSection(upgrades = {}, blueprintName = '', progress = {}, owned = false) {
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
          <h5>${escapeHtml(label)}</h5>
          <label class="upgrade-stage-control">
            <span class="sr-only">${escapeHtml(label)} status</span>
            <select class="upgrade-stage-select" data-stage-key="${escapeHtml(stageKey)}" data-blueprint-name="${escapeHtml(blueprintName)}" ${owned ? '' : 'disabled'}>
              ${options.map((option) => `<option value="${option.value}" ${stageValue === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
            </select>
          </label>
        </div>
      </div>
    `
  }).filter(Boolean).join('')

  return `<div class="upgrade-groups-grid">${markup}</div>` || '<p class="empty-state">No upgrade milestones listed.</p>'
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
        <summary class="section-summary section-summary--toggle">
          <div class="section-summary-title">
            <h4>Filters</h4>
          </div>
          <span class="saved-view-filter-hint" aria-label="Filters can be collapsed without losing current selections">▶</span>
        </summary>
        <div class="section-body">
          <div class="saved-view-filters">
            <label class="saved-view-filter">
              <span>Dependency</span>
              <select data-saved-filter="dependency">
                ${renderSelectOptions([
                  ['any', 'Any Status'],
                  ['parent', 'Dependent On'],
                  ['child', 'Needed For'],
                ], savedViewCriteria.dependency)}
              </select>
            </label>
            <label class="saved-view-filter">
              <span>Ownership</span>
              <select data-saved-filter="ownership">
                ${renderSelectOptions([
                  ['any', 'Any Status'],
                  ['owned', 'Owned'],
                  ['not-owned', 'Not owned'],
                ], savedViewCriteria.ownership)}
              </select>
            </label>
            <label class="saved-view-filter">
              <span>Inventory</span>
              <select data-saved-filter="inventory">
                ${renderSelectOptions([
                  ['any', 'Any Status'],
                  ['has', 'Has Inventory'],
                  ['superior-or-better', 'Superior or Better'],
                ], savedViewCriteria.inventory)}
              </select>
            </label>
            <label class="saved-view-filter saved-view-filter-mastered">
              <span>Mastered</span>
              <select data-saved-filter="mastered">
                ${renderSelectOptions([
                  ['any', 'Any Status'],
                  ['mastered', 'Mastered'],
                  ['not-mastered', 'Not Mastered'],
                ], savedViewCriteria.mastered)}
              </select>
            </label>
            <fieldset class="saved-view-filter saved-view-filter-multiselect">
              <legend>Collection Book</legend>
              <div class="saved-view-filter saved-view-filter-collection-state">
                <span>Select qualities to match</span>
                <div class="saved-view-match-radios" role="radiogroup" aria-label="Collection Book match state">
                  ${[
                    ['completed', 'Completed', 'Completed checks finished qualities'],
                    ['needed', 'Still Needed', 'Still Needed checks missing qualities'],
                  ].map(([value, label]) => `
                    <label class="saved-view-match-option">
                      <input
                        type="radio"
                        name="collection-book-match"
                        data-saved-filter="collectionBookState"
                        value="${value}"
                        ${savedViewCriteria.collectionBookState === value ? 'checked' : ''}
                      />
                      <span>${label}</span>
                    </label>
                  `).join('')}
                </div>
                <div class="saved-view-match-description">
                  ${getCollectionBookMatchDescription(savedViewCriteria.collectionBookState)}
                </div>
              </div>
              <div class="collection-book-options">
                ${renderCollectionBookFilterOptions(savedViewCriteria.collectionBook)}
              </div>
            </fieldset>
          </div>
          <form class="saved-view-save-row" data-save-view-form>
            <input type="text" maxlength="60" placeholder="View Name (e.g. Not Owned + Dependents)" value="${escapeHtml(savedViewDraftName)}" data-saved-view-name />
            <button type="submit" class="saved-view-save-button">Save View</button>
            <p class="saved-view-save-error" data-save-view-error aria-live="polite"></p>
          </form>
        </div>
      </details>
    </div>

    <div class="saved-view-results overlay-card">
      <div class="overlay-section">
        <div class="section-summary">
          <div class="section-summary-title">
            <h4>Results</h4>
          </div>
          <span class="group-count">${filteredItems.length}/${totalCount}</span>
        </div>
        <div class="section-body">
          ${renderSavedViewResults(filteredItems, dependencyIndex)}
        </div>
      </div>
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

    if (!grouped.has(category)) {
      grouped.set(category, {
        category,
        types: new Map(),
        totalItems: 0,
      })
    }

    const categoryGroup = grouped.get(category)
    categoryGroup.totalItems += 1

    if (!categoryGroup.types.has(type)) {
      categoryGroup.types.set(type, {
        type,
        items: [],
      })
    }

    categoryGroup.types.get(type).items.push(item)
  })

  return Array.from(grouped.values()).map((categoryGroup) => {
    const typeMarkup = Array.from(categoryGroup.types.values()).map((typeGroup) => {
      const listMarkup = typeGroup.items.map((item) => {
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
              <span class="icon-slot group-summary-icon" aria-hidden="true"><i data-lucide="${escapeHtml(getTypeIconName(typeGroup.type, categoryGroup.category))}"></i></span>
              <span>${escapeHtml(typeGroup.type)}</span>
            </span>
            <span class="group-count">${typeGroup.items.length}</span>
          </summary>
          <ul class="material-list dependency-list">${listMarkup}</ul>
        </details>
      `
    }).join('')

    return `
      <details class="blueprint-category" open>
        <summary>
          <span class="group-summary-title">
            <span class="icon-slot group-summary-icon" aria-hidden="true"><i data-lucide="${escapeHtml(getCategoryIconName(categoryGroup.category))}"></i></span>
            <span>${escapeHtml(categoryGroup.category)}</span>
          </span>
          <span class="group-count">${categoryGroup.totalItems}</span>
        </summary>
        <div class="category-body">${typeMarkup}</div>
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

  savedViewsContentEl.querySelectorAll('[data-saved-filter-book]').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const target = event.currentTarget
      const quality = target.dataset.savedFilterBook
      if (!quality) {
        return
      }

      const nextCollectionBook = new Set(savedViewCriteria.collectionBook || [])
      if (target.checked) {
        nextCollectionBook.add(quality)
      } else {
        nextCollectionBook.delete(quality)
      }

      savedViewCriteria = {
        ...savedViewCriteria,
        collectionBook: [...nextCollectionBook],
      }

      activeSavedViewPreset = 'custom'
      renderSavedViews(items)
    })
  })

  const saveViewForm = savedViewsContentEl.querySelector('[data-save-view-form]')
  if (saveViewForm) {
    const nameInput = savedViewsContentEl.querySelector('[data-saved-view-name]')
    nameInput?.addEventListener('input', (event) => {
      const target = event.currentTarget
      savedViewDraftName = target?.value || ''
    })

    saveViewForm.addEventListener('submit', (event) => {
      event.preventDefault()
      const saveErrorEl = savedViewsContentEl.querySelector('[data-save-view-error]')
      const nextName = cleanText(nameInput?.value)
      const hasName = Boolean(nextName)
      const hasSelectedFilter = hasActiveSavedViewFilters(savedViewCriteria)

      if (saveErrorEl) {
        saveErrorEl.textContent = ''
      }

      if (!hasName && !hasSelectedFilter) {
        if (saveErrorEl) {
          saveErrorEl.textContent = 'Add a name so you can recognize this view later, and select at least one filter before saving a view.'
        }
        nameInput?.focus()
        return
      }

      if (!hasName) {
        if (saveErrorEl) {
          saveErrorEl.textContent = 'Add a name so you can recognize this view later.'
        }
        nameInput?.focus()
        return
      }

      if (!hasSelectedFilter) {
        if (saveErrorEl) {
          saveErrorEl.textContent = 'Select at least one filter before saving a view.'
        }
        return
      }

      const savedView = saveCurrentFilterAsView(nextName)
      savedViewDraftName = ''
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
  savedViewCriteria = normalizeSavedViewCriteria({
    ...DEFAULT_SAVED_VIEW_CRITERIA,
    ...preset.criteria,
  })

  renderSavedViews(items)
}

function applySavedFilterView(viewId, items = []) {
  const view = savedFilterViews.find((entry) => entry.id === viewId)
  if (!view) {
    return
  }

  activeSavedViewPreset = `saved:${view.id}`
  savedViewCriteria = normalizeSavedViewCriteria({
    ...DEFAULT_SAVED_VIEW_CRITERIA,
    ...(view.criteria || {}),
  })

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

function getCollectionBookMatchDescription(state = 'completed') {
  return state === 'needed'
    ? 'Still Needed checks missing qualities.'
    : 'Completed checks finished qualities.'
}

function renderCollectionBookFilterOptions(selectedValues = []) {
  const normalizedSelected = new Set(Array.isArray(selectedValues) ? selectedValues.map((value) => String(value).toLowerCase()) : [])
  const options = ['superior', 'flawless', 'epic', 'legendary']

  return options.map((quality) => {
    const label = formatQualityLabel(quality)
    const isChecked = normalizedSelected.has(quality)
    const qualityClass = getQualityClass(label)
    return `
      <label class="collection-book-option ${qualityClass}">
        <input type="checkbox" data-saved-filter-book="${escapeHtml(quality)}" ${isChecked ? 'checked' : ''} />
          <span>${escapeHtml(label)}</span>
      </label>
    `
  }).join('')
}

function normalizeSavedViewCriteria(criteria = {}) {
  const collectionBook = Array.isArray(criteria.collectionBook)
    ? criteria.collectionBook
    : typeof criteria.collection === 'string' && criteria.collection !== 'any'
      ? [criteria.collection]
      : []

  return {
    dependency: ['any', 'parent', 'child'].includes(criteria.dependency) ? criteria.dependency : 'any',
    ownership: ['owned', 'not-owned', 'any'].includes(criteria.ownership) ? criteria.ownership : 'any',
    inventory: ['any', 'has', 'superior-or-better'].includes(criteria.inventory) ? criteria.inventory : 'any',
    mastered: ['any', 'mastered', 'not-mastered'].includes(criteria.mastered) ? criteria.mastered : 'any',
    collectionBookState: ['completed', 'needed'].includes(criteria.collectionBookState) ? criteria.collectionBookState : 'completed',
    collectionBook: collectionBook.filter((value) => ['superior', 'flawless', 'epic', 'legendary'].includes(String(value).toLowerCase())),
  }
}

function hasActiveSavedViewFilters(criteria = {}) {
  const normalizedCriteria = normalizeSavedViewCriteria(criteria)
  return normalizedCriteria.dependency !== 'any'
    || normalizedCriteria.ownership !== 'any'
    || normalizedCriteria.inventory !== 'any'
    || normalizedCriteria.mastered !== 'any'
    || normalizedCriteria.collectionBook.length > 0
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
  const normalizedCriteria = normalizeSavedViewCriteria(criteria)

  return items.filter((item) => {
    const summary = buildBlueprintSummary(item, dependencyIndex)

    if (normalizedCriteria.dependency === 'parent' && !summary.isParentDependency) {
      return false
    }

    if (normalizedCriteria.dependency === 'child' && !summary.isChildDependency) {
      return false
    }

    if (normalizedCriteria.ownership === 'owned' && !summary.isOwned) {
      return false
    }

    if (normalizedCriteria.ownership === 'not-owned' && summary.isOwned) {
      return false
    }

    if (normalizedCriteria.inventory === 'has' && !summary.hasInventory) {
      return false
    }

    if (normalizedCriteria.inventory === 'superior-or-better' && !summary.hasSuperiorOrBetterInventory) {
      return false
    }

    if (normalizedCriteria.mastered === 'mastered' && !summary.isMastered) {
      return false
    }

    if (normalizedCriteria.mastered === 'not-mastered' && summary.isMastered) {
      return false
    }

    if (normalizedCriteria.collectionBook.length) {
      const qualitiesToMatch = normalizedCriteria.collectionBookState === 'needed'
        ? summary.collectionBookNeededQualities
        : summary.collectionBookQualities
      const collectionMatches = normalizedCriteria.collectionBook.some((quality) => qualitiesToMatch.includes(quality))
      if (!collectionMatches) {
        return false
      }
    }

    return true
  })
}

function buildBlueprintSummary(item, dependencyIndex) {
  const progress = getBlueprintProgressState(item.name)
  const craftingMilestones = Array.isArray(item?.structuredData?.upgrades?.crafting) ? item.structuredData.upgrades.crafting : []
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
  const isMastered = Boolean(progress.owned) && craftingMilestones.length >= 5 && getBlueprintMilestoneKeys(item.name, craftingMilestones.slice(0, 5)).every((key) => isTrackedUpgrade(key))
  const collectionBookQualities = Object.entries(progress.collectionBook || {})
    .filter(([, checked]) => Boolean(checked))
    .map(([quality]) => quality)
  const allCollectionQualities = ['superior', 'flawless', 'epic', 'legendary']
  const collectionBookNeededQualities = allCollectionQualities.filter((quality) => !collectionBookQualities.includes(quality))

  const hasSuperiorOrBetterInventory = INVENTORY_QUALITY_KEYS.slice(1).some((qualityKey) => toInventoryCount(blueprintState.inventory?.[qualityKey]) > 0)

  return {
    isOwned: Boolean(progress.owned),
    isMastered,
    isParentDependency: hasCraftingComponents(item),
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
          criteria: normalizeSavedViewCriteria(entry.criteria || {}),
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
  scheduleGoogleSyncWrite()
  refreshSavedViewsResults()
}

function saveCurrentFilterAsView(name) {
  const normalizedName = name.toLowerCase()
  const existing = savedFilterViews.find((entry) => entry.name.toLowerCase() === normalizedName)

  if (existing) {
    existing.criteria = normalizeSavedViewCriteria(savedViewCriteria)
    saveSavedFilterViews()
    return existing
  }

  const nextView = {
    id: `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    criteria: normalizeSavedViewCriteria(savedViewCriteria),
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

function refreshSavedViewsResults() {
  if (Array.isArray(allBlueprintItems) && allBlueprintItems.length) {
    renderSavedViews(allBlueprintItems)
  }
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

function loadBlueprintProgressMap() {
  try {
    const stored = JSON.parse(localStorage.getItem(BLUEPRINT_PROGRESS_STORAGE_KEY) || '{}')
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  } catch (error) {
    console.warn('Unable to load blueprint progress.', error)
    return {}
  }
}

function saveTrackedUpgradeKeys() {
  localStorage.setItem(TRACKED_UPGRADES_STORAGE_KEY, JSON.stringify([...trackedUpgradeKeys]))
  scheduleGoogleSyncWrite()
  refreshSavedViewsResults()
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
  return blueprintProgressByName[blueprintName] || {}
}

function saveBlueprintProgressState(blueprintName, updates) {
  blueprintProgressByName[blueprintName] = {
    ...(blueprintProgressByName[blueprintName] || {}),
    ...updates,
  }

  localStorage.setItem(BLUEPRINT_PROGRESS_STORAGE_KEY, JSON.stringify(blueprintProgressByName))
  scheduleGoogleSyncWrite()
  refreshSavedViewsResults()
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

function persistBlueprintStage(blueprintName, stageKey, value) {
  const normalizedValue = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
  saveBlueprintProgressState(blueprintName, { [stageKey]: normalizedValue })
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
  document.body.classList.remove('blueprint-overlay-open')
  blueprintOverlayContent.innerHTML = ''
}

function getBlueprintVisuals(item) {
  const category = item?.classification?.category || 'Accessories'
  const type = item?.classification?.type || item?.structuredData?.meta?.type || ''

  return {
    category,
    type,
  }
}

function applyTheme(theme, options = {}) {
  const skipSync = Boolean(options.skipSync)
  applySharedTheme(theme, { themeInputs })
  if (!skipSync) {
    scheduleGoogleSyncWrite()
  }
}

function applyFontPreference(fontPreference, options = {}) {
  const skipSync = Boolean(options.skipSync)
  applySharedFontPreference(fontPreference, { fontSelect })
  if (!skipSync) {
    scheduleGoogleSyncWrite()
  }
}

function getStoredTheme() {
  return getSharedStoredTheme()
}

function getStoredFontPreference() {
  return getSharedStoredFontPreference()
}

async function resolveSpreadsheetUrl(rawUrl) {
  const normalizedUrl = normalizeUrl(rawUrl)

  if (!import.meta.env.DEV) {
    // Production deployments (for example static Vercel) may not provide /api/resolve.
    // Try to follow redirects directly, then fall back to the known official sheet URL.
    if (/docs\.google\.com\/spreadsheets\/d\//i.test(normalizedUrl)) {
      return normalizedUrl
    }

    try {
      const directResponse = await fetch(normalizedUrl, {
        redirect: 'follow',
      })
      if (directResponse?.url && /docs\.google\.com\/spreadsheets\/d\//i.test(directResponse.url)) {
        return directResponse.url
      }
    } catch (error) {
      console.warn('Direct production spreadsheet URL resolve failed; using fallback URL.', error)
    }

    return FALLBACK_GOOGLE_SHEET_URL
  }

  const proxyUrl = `/api/resolve?url=${encodeURIComponent(normalizedUrl)}`
  const response = await fetch(proxyUrl)

  if (!response.ok) {
    if (!/docs\.google\.com\/spreadsheets\/d\//i.test(normalizedUrl)) {
      return FALLBACK_GOOGLE_SHEET_URL
    }
    throw new Error(`The spreadsheet link returned ${response.status}.`)
  }

  const resolved = await response.text()
  const nextUrl = resolved.trim()
  if (!nextUrl) {
    return FALLBACK_GOOGLE_SHEET_URL
  }

  return nextUrl
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
    previewEl.innerHTML = '<p class="empty-state">No rows were returned from the sheet.</p>'
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
  if (!rows.length && structuredBlueprints.length) {
    // If we're loading from cache, we only have structured data
    return structuredBlueprints.map((structuredData) => {
      const name = structuredData.meta?.name || 'Unknown'
      const type = structuredData.meta?.type || 'Unknown'
      const tier = structuredData.meta?.tier

      const classification = classifyBlueprint(type, name)
      return {
        name,
        meta: tier ? `Tier ${tier}` : 'No tier',
        structuredData,
        classification,
      }
    })
  }

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
    { key: 'crafting', labelPrefix: 'Crafting Upgrade' },
    { key: 'starforged', labelPrefix: 'Starforged Milestone' },
    { key: 'ascension', labelPrefix: 'Ascension Upgrade' },
    { key: 'transcendence', labelPrefix: 'Transcendence Upgrade' },
  ]

  upgradeGroups.forEach(({ key, labelPrefix }) => {
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
