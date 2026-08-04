import './style.css'
import { initAnalytics, recordView } from './analytics.js'
import { mountAdBanner } from './adBanner.js'
import { getRandomTavernText } from './kofiText.js'
import { useGoogleAuth } from './useGoogleAuth.js'
import {
  ensureUserSyncSpreadsheet,
  getGoogleSyncErrorMessage,
  isTokenExpiredError,
  migrateLegacyBlueprintSchemaInPlace,
  parseWorkbookBlueprintProgress,
  readSyncTables,
  shouldWipeSpreadsheetId,
  writeSyncTables,
} from './googleSheetSync.js'
import { pickFolderFromDrive, pickSpreadsheetFromDrive } from './googleDrivePicker.js'
import { getItem, setItem, removeItem } from './storage.js'
import { getBlueprintStageValue, getBlueprintStageOptions } from './blueprintStageOptions.js'
import { initSettingsUi, applyTheme as applySharedTheme, applyFontPreference as applySharedFontPreference, getStoredTheme as getSharedStoredTheme, getStoredFontPreference as getSharedStoredFontPreference } from './settingsUi.js'
import { SETTINGS_GEAR_ICON_MARKUP } from './settingsGearIcon.js'
import { escapeHtml, cleanText, toInventoryCount } from './textUtils.js'
import { getBlueprintItemIconName, getGroupIconName, getTypeIconName } from './blueprintIcons.js'
import { buildBlueprintItems, convertBlueprintRowToObject } from './blueprintParsing.js'
import { BLUEPRINT_GROUP_TYPE_ORDER } from './assets/blueprintTypeOrder.js'
import { RESOURCE_LABELS } from './resourceLabels.js'
import { DEFAULT_SAVED_VIEW_CRITERIA, STARTER_VIEW_PRESETS, SAVED_FILTER_VIEWS_STORAGE_KEY, buildSavedViewsRows, getCollectionBookMatchDescription, hasActiveSavedViewFilters, loadSavedFilterViews, normalizeSavedViewCriteria, parseSavedViewsRows } from './savedViews.js'
import { buildBlueprintSummary, buildDependencySummaryLine, getBlueprintVisuals, renderCollectionSection, renderInventorySection, renderLucideIcons, renderMaterialsSection, renderOverlaySectionCard, renderPreview, renderStatsCards, renderUpgradeSection } from './blueprintView.js'

const DEFAULT_SPREADSHEET_URL = 'https://playshoptitans.com/spreadsheet'
const FALLBACK_GOOGLE_SHEET_URL = import.meta.env.VITE_BLUEPRINT_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c/edit'
const GOOGLE_PICKER_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || ''

const GROUP_DEFINITIONS = BLUEPRINT_GROUP_TYPE_ORDER
const GROUP_ORDER_INDEX = new Map(
  GROUP_DEFINITIONS.map((definition, index) => [definition.group, index])
)
const GROUP_TYPE_ORDER_INDEX = new Map(
  GROUP_DEFINITIONS.map((definition) => [
    definition.group,
    new Map(definition.types.map((type, index) => [type, index])),
  ])
)

const app = document.querySelector('#app')
const INVENTORY_QUALITY_KEYS = ['normal', 'superior', 'flawless', 'epic', 'legendary']
const COLLECTION_BOOK_QUALITY_ORDER = ['legendary', 'epic', 'flawless', 'superior']
const STARTER_SAVED_VIEW_ID_PREFIX = 'starter-view:'
const TRACKED_UPGRADES_STORAGE_KEY = 'shopkeeper-tracked-upgrades'
const BLUEPRINT_PROGRESS_STORAGE_KEY = 'shopkeeper-blueprint-progress'
const HIDDEN_STARTER_VIEW_PRESETS_STORAGE_KEY = 'shopkeeper-hidden-starter-view-presets-v2'
const HIDDEN_STARTER_VIEW_PRESETS_SETTINGS_KEY = 'hidden-starter-view-presets-v2'
const BLUEPRINT_CACHE_STORAGE_KEY = 'shopkeeper-blueprint-cache-v1'
const GOOGLE_SYNC_SPREADSHEET_ID_STORAGE_KEY = 'shopkeeper-google-sync-spreadsheet-id'
const GOOGLE_SYNC_SPREADSHEET_ID_COOKIE_KEY = 'shopkeeper_google_sync_spreadsheet_id'
const GOOGLE_SYNC_WRITE_DEBOUNCE_MS = 900
const KOFI_HANDLE = 'shopkeepercompanion'
const KOFI_URL = 'https://ko-fi.com/shopkeepercompanion'

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
            <summary><span class="advanced-sync-toggle-icon" aria-hidden="true">▶</span> Why Google Sheets?</summary>
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

  <footer class="site-footer-links" aria-label="Legal and project links">
    <a class="site-footer-link" href="/support.html">Support</a>
    <span class="site-footer-separator" aria-hidden="true">•</span>
    <a class="site-footer-link" href="/about.html">About</a>
    <span class="site-footer-separator" aria-hidden="true">•</span>
    <a class="site-footer-link" href="/privacy.html">Privacy Policy</a>
  </footer>
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
let hiddenStarterViewPresetIds = loadHiddenStarterViewPresetIds()

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
let isSavedViewFiltersPanelOpen = true
let pendingGoogleSyncWriteTimer = null
let pendingGoogleSyncInitPromise = null
let hasPendingBlueprintSchemaMigration = false
let isApplyingRemoteSyncState = false
let latestSavedViewItems = []
let hasBoundSavedViewDelegates = false
let blueprintVersionLabel = ''
let disposeDesktopAd = () => {}
let disposeMobileAd = () => {}
let hasTrackedAdBannerRefresh = false
const dependencyIndexCache = new WeakMap()
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
    if (tab.dataset.view === 'saved-views') {
      window.location.hash = '#saved-views'
    } else {
      window.location.hash = '#blueprints'
    }
  })
})

if (window.location.hash === '#saved-views') {
  activateView('saved-views')
} else {
  activateView('blueprints')
}

initAnalytics({ trackInitialView: true })

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#saved-views') {
    activateView('saved-views')
  } else {
    activateView('blueprints')
  }

  recordView()
})

applyTheme(getSharedStoredTheme())
applyFontPreference(getSharedStoredFontPreference())
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

  const themeHint = document.body.classList.contains('theme-dark') ? 'dark' : 'light'

  disposeDesktopAd = mountAdBanner(desktopAdBannerEl, {
    publisher: KOFI_HANDLE,
    kofiUrl: KOFI_URL,
    theme: themeHint,
  })

  disposeMobileAd = mountAdBanner(mobileAdBannerEl, {
    publisher: KOFI_HANDLE,
    kofiUrl: KOFI_URL,
    theme: themeHint,
  })

  if (hasTrackedAdBannerRefresh) {
    recordView()
  }

  hasTrackedAdBannerRefresh = true
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

function isGoogleAuthSetupStep() {
  return googleSyncState.setupStep === 'choose-source' || googleSyncState.setupStep === 'enter-existing'
}

function buildGoogleAuthSetupPrompt() {
  return googleSyncState.setupStep === 'choose-source'
    ? 'Choose where to connect your Shopkeeper Companion sync sheet from Google Drive.'
    : 'Paste your Google Sheet share link or file ID to connect your existing sync sheet.'
}

function buildGoogleAuthSetupInputMarkup() {
  if (googleSyncState.setupStep === 'enter-existing') {
    return `
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
  }

  return `
    <div class="auth-controls">
      <button type="button" class="auth-button" data-auth-action="pick-existing-sheet">Pick existing sheet</button>
      <button type="button" class="auth-button auth-button-secondary" data-auth-action="enter-existing">Paste share link / file ID</button>
      <button type="button" class="auth-button" data-auth-action="create-new-sheet">Create new sheet</button>
      <button type="button" class="auth-button auth-button-secondary" data-auth-action="create-new-in-folder">Create new sheet in chosen folder</button>
    </div>
  `
}

function buildGoogleAuthSetupMarkup(signOutDisabled) {
  return `
    <p class="settings-copy sync-caption">${escapeHtml(buildGoogleAuthSetupPrompt())}</p>
    ${buildGoogleAuthSetupInputMarkup()}
    ${googleSyncState.setupError ? `<p class="settings-copy sync-caption sync-error">${escapeHtml(googleSyncState.setupError)}</p>` : ''}
    ${googleSyncState.error ? `<p class="settings-copy sync-caption sync-error">${escapeHtml(googleSyncState.error)}</p>` : ''}
    <div class="auth-controls">
      <button type="button" class="auth-button auth-button-secondary" data-auth-action="sign-out" ${signOutDisabled ? 'disabled' : ''}>Sign Out</button>
    </div>
  `
}

function bindGoogleAuthSetupActions(state) {
  if (!googleAuthContainer) {
    return
  }

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
}

function buildGoogleAuthConnectedMarkup(signOutDisabled) {
  const syncLabel = googleSyncState.lastSyncedAt
    ? `Last sync: ${new Date(googleSyncState.lastSyncedAt).toLocaleString()}`
    : 'Connected. Ready to sync.'
  const syncDisabled = googleSyncState.isSyncing || !googleSyncState.isReady

  return `
    <div class="auth-controls">
      <button type="button" class="auth-button" data-auth-action="sync-now" ${syncDisabled ? 'disabled' : ''}>${googleSyncState.isSyncing ? 'Syncing…' : 'Sync Now'}</button>
      <button type="button" class="auth-button auth-button-secondary" data-auth-action="change-sync-sheet" ${googleSyncState.isSyncing ? 'disabled' : ''}>Change Sync Sheet</button>
      <button type="button" class="auth-button auth-button-secondary" data-auth-action="sign-out" ${signOutDisabled ? 'disabled' : ''}>Sign Out</button>
    </div>
    <p class="settings-copy sync-caption">${escapeHtml(syncLabel)}</p>
    ${googleSyncState.notice ? `<p class="settings-copy sync-caption">${escapeHtml(googleSyncState.notice)}</p>` : ''}
    ${googleSyncState.error ? `<p class="settings-copy sync-caption sync-error">${escapeHtml(googleSyncState.error)}</p>` : ''}
  `
}

function bindGoogleAuthConnectedActions() {
  if (!googleAuthContainer) {
    return
  }

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
}

function renderGoogleAuthSignedOutUi(state) {
  if (!googleAuthContainer) {
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
    return
  }

  if (authMessage) {
    googleAuthContainer.insertAdjacentHTML('beforeend', authMessage)
  }
}

function renderGoogleAuthUi(state) {
  if (!googleAuthContainer) {
    return
  }

  const signOutDisabled = state.isLoading || state.isAuthenticating || !state.isAuthenticated

  if (state.isAuthenticated) {
    if (isGoogleAuthSetupStep()) {
      googleAuthContainer.innerHTML = buildGoogleAuthSetupMarkup(signOutDisabled)
      bindGoogleAuthSetupActions(state)
      return
    }

    googleAuthContainer.innerHTML = buildGoogleAuthConnectedMarkup(signOutDisabled)
    bindGoogleAuthConnectedActions()
    return
  }

  renderGoogleAuthSignedOutUi(state)
}

function refreshGoogleAuthUi() {
  renderGoogleAuthUi(googleAuth.getState())
}

function resetGoogleSyncForSignedOutState() {
  googleSyncState.isReady = false
  googleSyncState.error = ''
  googleSyncState.notice = ''
  googleSyncState.isSyncing = false
  googleSyncState.setupStep = 'idle'
  googleSyncState.setupInput = ''
  googleSyncState.setupError = ''
  googleSyncState.selectedSpreadsheetId = ''
  pendingGoogleSyncInitPromise = null
}

function beginGoogleSyncRun({ clearError = true, clearNotice = false } = {}) {
  googleSyncState.isSyncing = true
  if (clearError) {
    googleSyncState.error = ''
  }
  if (clearNotice) {
    googleSyncState.notice = ''
  }
  refreshGoogleAuthUi()
}

function finishGoogleSyncRun() {
  googleSyncState.isSyncing = false
  refreshGoogleAuthUi()
}

function setGoogleSyncNotice(notice = '') {
  googleSyncState.notice = notice
  refreshGoogleAuthUi()
}

function setGoogleSyncError(error, { clearNotice = false } = {}) {
  googleSyncState.error = typeof error === 'string'
    ? error
    : getGoogleSyncErrorMessage(error)
  if (clearNotice) {
    googleSyncState.notice = ''
  }
  refreshGoogleAuthUi()
}

async function handleGoogleAuthStateChange(state) {
  if (!state?.isAuthenticated || !state?.accessToken) {
    resetGoogleSyncForSignedOutState()
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
    if (googleSyncState.spreadsheetId) {
      setGoogleSyncNotice('Reconnecting to your Google Sync sheet...')
    }

    await initializeGoogleSync(state.accessToken, {
      preferredSpreadsheetId: googleSyncState.selectedSpreadsheetId || googleSyncState.spreadsheetId,
      reason: googleSyncState.selectedSpreadsheetId || googleSyncState.spreadsheetId ? 'recovery' : 'new-user',
    })
  }
}

async function refreshGoogleTokenForRetry({ interactive = false } = {}) {
  try {
    const token = await googleAuth.refreshAccessToken({ interactive })
    if (typeof token === 'string' && token.trim()) {
      return token
    }
  } catch (error) {
    if (interactive) {
      throw error
    }
  }

  return ''
}

async function getRetryAccessToken() {
  const silentToken = await refreshGoogleTokenForRetry({ interactive: false })
  if (silentToken) {
    return silentToken
  }

  return refreshGoogleTokenForRetry({ interactive: true })
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
  const hasRetriedAuth = Boolean(options?.hasRetriedAuth)

  pendingGoogleSyncInitPromise = (async () => {
    const runInitialization = async (currentAccessToken) => {
      const ensured = await ensureUserSyncSpreadsheet(currentAccessToken, preferredSpreadsheetId, {
        reason: syncReason,
        targetFolderId,
        confirmCreate: async (message) => {
          setGoogleSyncNotice(message)
          return window.confirm(message)
        },
      })
      googleSyncState.spreadsheetId = ensured.spreadsheetId
      googleSyncState.spreadsheetUrl = ensured.spreadsheetUrl
      await persistGoogleSyncSpreadsheetId(ensured.spreadsheetId)

      const remote = await readSyncTables(currentAccessToken, ensured.spreadsheetId)
      if (hasRemoteSyncData(remote)) {
        applyRemoteSyncState(remote)
        if (remote?.requiresBlueprintSchemaMigration || remote?.requiresBlueprintOrderNormalization) {
          await migrateBlueprintSchemaIfNeeded(currentAccessToken, remote)
        }
      } else if (hasLocalUserData()) {
        await pushLocalStateToGoogleSheet(currentAccessToken)
      }

      googleSyncState.isReady = true
      googleSyncState.notice = ''
      googleSyncState.lastSyncedAt = new Date().toISOString()
      refreshGoogleAuthUi()

      return true
    }

    try {
      beginGoogleSyncRun({ clearNotice: true })

      try {
        await runInitialization(accessToken, hasRetriedAuth)
      } catch (error) {
        if (isTokenExpiredError(error) && !hasRetriedAuth) {
          try {
            const refreshedToken = await getRetryAccessToken()
            if (refreshedToken) {
              googleSyncState.notice = ''
              await runInitialization(refreshedToken, true)
              return
            }
          } catch (refreshError) {
            setGoogleSyncError(refreshError, { clearNotice: true })
            googleSyncState.isReady = false
            console.error(refreshError)
            return
          }
        }

        setGoogleSyncError(error, { clearNotice: true })
        googleSyncState.isReady = false

        if (shouldWipeSpreadsheetId(error)) {
          googleSyncState.spreadsheetId = ''
          googleSyncState.spreadsheetUrl = ''
          await clearStoredGoogleSyncSpreadsheetId()
        }

        console.error(error)
      }
    } finally {
      finishGoogleSyncRun()
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
  async function runSync(currentAccessToken, hasRetriedAuth = false) {
    if (!googleSyncState.isReady || !googleSyncState.spreadsheetId) {
      await initializeGoogleSync(currentAccessToken)
    }

    if (!googleSyncState.spreadsheetId) {
      throw new Error('Google Sync Sheet is not connected yet.')
    }

    beginGoogleSyncRun({ clearNotice: true })

    try {
      const remote = await readSyncTables(currentAccessToken, googleSyncState.spreadsheetId)
      applyRemoteSyncState(remote)
      if (remote?.requiresBlueprintSchemaMigration || remote?.requiresBlueprintOrderNormalization) {
        await migrateBlueprintSchemaIfNeeded(currentAccessToken, remote)
      }
      googleSyncState.lastSyncedAt = new Date().toISOString()
      refreshGoogleAuthUi()
      updateStatus('Synced user data from Google Sheet.', 'info')
    } catch (error) {
      if (isTokenExpiredError(error) && !hasRetriedAuth) {
        const refreshedToken = await getRetryAccessToken()
        if (refreshedToken) {
          await runSync(refreshedToken, true)
          return
        }
      }

      setGoogleSyncError(error)
      console.error(error)
    } finally {
      finishGoogleSyncRun()
    }
  }

  const authState = googleAuth.getState()
  if (!authState?.isAuthenticated || !authState?.accessToken) {
    return
  }

  await runSync(authState.accessToken)
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
    Boolean(hiddenStarterViewPresetIds.size) ||
    Boolean(trackedUpgradeKeys.size) ||
    Boolean(Object.keys(blueprintProgressByName).length)
  )
}

function applyRemoteSyncState(remoteTables) {
  isApplyingRemoteSyncState = true

  try {
    const settings = parseSettingsRows(remoteTables.settings)

    hiddenStarterViewPresetIds = new Set(parseHiddenStarterViewPresetRows(settings))
    localStorage.setItem(HIDDEN_STARTER_VIEW_PRESETS_STORAGE_KEY, JSON.stringify([...hiddenStarterViewPresetIds]))

    savedFilterViews = parseSavedViewsRows(remoteTables.savedViews)
    ensureStarterSavedViewsPresent()
    hasLoadedSavedFilterViews = true
    localStorage.setItem(SAVED_FILTER_VIEWS_STORAGE_KEY, JSON.stringify(savedFilterViews))

    trackedUpgradeKeys = new Set(parseTrackedUpgradeRows(settings))
    localStorage.setItem(TRACKED_UPGRADES_STORAGE_KEY, JSON.stringify([...trackedUpgradeKeys]))

    blueprintProgressByName = parseWorkbookBlueprintProgress(remoteTables.blueprintProgress, blueprintProgressByName)
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

  async function runWrite(currentAccessToken, hasRetriedAuth = false) {
    ensureSavedFilterViewsLoaded()
    beginGoogleSyncRun()

    try {
      await writeSyncTables(currentAccessToken, googleSyncState.spreadsheetId, {
        settings: buildSettingsRows(),
        savedViews: buildSavedViewsRows(savedFilterViews),
        blueprintItems: allBlueprintItems,
        blueprintProgressByName,
      })

      googleSyncState.lastSyncedAt = new Date().toISOString()
    } catch (error) {
      if (isTokenExpiredError(error) && !hasRetriedAuth) {
        const refreshedToken = await getRetryAccessToken()
        if (refreshedToken) {
          await runWrite(refreshedToken, true)
          return
        }
      }

      setGoogleSyncError(error)
      console.error(error)
    } finally {
      finishGoogleSyncRun()
    }
  }

  await runWrite(accessToken)
}

function buildSettingsRows() {
  return [
    ['tracked-upgrades', JSON.stringify([...trackedUpgradeKeys])],
    [HIDDEN_STARTER_VIEW_PRESETS_SETTINGS_KEY, JSON.stringify([...hiddenStarterViewPresetIds])],
  ]
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

function parseHiddenStarterViewPresetRows(settings = {}) {
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    const raw = cleanText(settings[HIDDEN_STARTER_VIEW_PRESETS_SETTINGS_KEY])
    if (!raw) {
      return []
    }

    const validPresetIds = new Set(STARTER_VIEW_PRESETS.map((preset) => preset.id))

    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed)
        ? parsed.map((value) => cleanText(value)).filter((value) => validPresetIds.has(value))
        : []
    } catch {
      return []
    }
  }

  return []
}

async function writeCurrentSyncTables(accessToken) {
  ensureSavedFilterViewsLoaded()
  await writeSyncTables(accessToken, googleSyncState.spreadsheetId, {
    settings: buildSettingsRows(),
    savedViews: buildSavedViewsRows(savedFilterViews),
    blueprintItems: allBlueprintItems,
    blueprintProgressByName,
  })
}

async function migrateBlueprintSchemaIfNeeded(accessToken, remoteTables = {}) {
  if (!remoteTables?.requiresBlueprintSchemaMigration && !remoteTables?.requiresBlueprintOrderNormalization) {
    return
  }

  if (remoteTables?.requiresBlueprintSchemaMigration && googleSyncState.spreadsheetId) {
    await migrateLegacyBlueprintSchemaInPlace(accessToken, googleSyncState.spreadsheetId)
  }

  if (!allBlueprintItems.length) {
    hasPendingBlueprintSchemaMigration = Boolean(remoteTables?.requiresBlueprintOrderNormalization)
    return
  }

  hasPendingBlueprintSchemaMigration = false
  await writeCurrentSyncTables(accessToken)
}

async function flushPendingBlueprintSchemaMigration(accessToken) {
  if (!hasPendingBlueprintSchemaMigration) {
    return
  }

  const normalizedAccessToken = typeof accessToken === 'string' ? accessToken.trim() : ''
  if (!normalizedAccessToken) {
    return
  }

  if (!allBlueprintItems.length || !googleSyncState.spreadsheetId) {
    return
  }

  hasPendingBlueprintSchemaMigration = false
  await writeCurrentSyncTables(normalizedAccessToken)
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
    allBlueprintItems = buildBlueprintItems(headers, rows, structuredBlueprints)
    if (isSuspiciousBlueprintDataset(allBlueprintItems)) {
      throw new Error('The blueprint import looked incomplete (items classified as Unknown). Please import again in a moment.')
    }

    blueprintVersionLabel = versionLabel || blueprintVersionLabel
    await saveBlueprintCache({ headers, rows, structuredBlueprints, versionLabel: blueprintVersionLabel })
    renderBlueprintVersionLabel(blueprintVersionLabel)

    renderPreview(allBlueprintItems, {
      previewEl,
      blueprintOverlay,
      groupDefinitions: GROUP_DEFINITIONS,
      onOpenBlueprintOverlay: openBlueprintOverlay,
      onCloseBlueprintOverlay: closeBlueprintOverlay,
      renderLucideIcons,
    })
    renderSavedViews(allBlueprintItems)
    await flushPendingBlueprintSchemaMigration(googleAuth.getState()?.accessToken)
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

  const { headers = [], rows = [], structuredBlueprints = [] } = cached
  allBlueprintItems = buildBlueprintItems(headers, rows, structuredBlueprints)
  if (isSuspiciousBlueprintDataset(allBlueprintItems)) {
    await removeItem(BLUEPRINT_CACHE_STORAGE_KEY)
    allBlueprintItems = []
    updateStatus('Cached blueprint data looked incomplete. Please import Blueprints again.', 'error')
    renderBlueprintEmptyState('Cached blueprint data looked incomplete. Click "Import Blueprints" in Settings to refresh the library.')
    return
  }

  renderPreview(allBlueprintItems, {
    previewEl,
    blueprintOverlay,
    groupDefinitions: GROUP_DEFINITIONS,
    onOpenBlueprintOverlay: openBlueprintOverlay,
    onCloseBlueprintOverlay: closeBlueprintOverlay,
    renderLucideIcons,
  })
  renderSavedViews(allBlueprintItems)
  await flushPendingBlueprintSchemaMigration(googleAuth.getState()?.accessToken)
  scheduleGoogleSyncWrite()
  updateStatus('', 'info')
}

async function saveBlueprintCache(payload) {
  const safePayload = {
    headers: Array.isArray(payload?.headers) ? payload.headers : [],
    rows: Array.isArray(payload?.rows) ? payload.rows : [],
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

    if ('rows' in cached && !Array.isArray(cached.rows)) {
      return null
    }

    return cached
  } catch (error) {
    console.warn('Unable to read blueprint cache.', error)
    return null
  }
}

function isSuspiciousBlueprintDataset(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return true
  }

  const unknownItems = items.filter((item) => {
    const group = String(item?.classification?.group || item?.classification?.category || '').trim().toLowerCase()
    const type = String(item?.classification?.type || '').trim().toLowerCase()
    return group === 'accessories' && type === 'unknown'
  })

  if (!unknownItems.length) {
    return false
  }

  const ratio = unknownItems.length / items.length
  return unknownItems.length === items.length || ratio >= 0.9
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
      if (target.classList.contains('starforge-unlock-checkbox')) {
        persistBlueprintStarforgeUnlock(item.name, target.checked)
        openBlueprintOverlay(item)
        return
      }

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
      const stageKey = target.dataset.stageKey || ''
      if (stageKey === 'milestones-starforge') {
        persistMilestonesStarforgeStage(item.name, target.value)
      } else if (stageKey === 'ascension-transcendence') {
        persistAscensionTranscendenceStage(item.name, target.value)
      } else {
        persistBlueprintStage(item.name, stageKey, Number(target.value))
      }
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
  const statsMarkup = renderStatsCards(overviewStats, {
    formatStatLabel,
    formatValue,
  })
  const materialsMarkup = renderMaterialsSection(structuredData.materials, {
    formatMaterialLabel,
    formatValue,
  })
  const upgradesMarkup = renderUpgradeSection(structuredData.upgrades, item.name, progress, owned, {
    getBlueprintStageValue,
    getBlueprintStageOptions,
    escapeHtml,
  })
  const inventoryMarkup = renderInventorySection(progress, {
    getQualityClass,
    escapeHtml,
  })
  const collectionMarkup = renderCollectionSection(progress, owned, {
    getQualityClass,
    escapeHtml,
  })

  const headerMarkup = `
    <div class="overlay-top-layout">
      <div class="overlay-hero">
        <div class="overlay-hero-background overlay-hero-symbol" aria-hidden="true">
          <span class="icon-slot overlay-hero-icon"><i data-lucide="${escapeHtml(getGroupIconName(visuals.group))}"></i></span>
        </div>
        <div class="overlay-hero-content">
          <div class="overlay-visual-strip" aria-hidden="true">
            <div class="overlay-visual-tile overlay-visual-category">
              <span class="icon-slot overlay-visual-icon"><i data-lucide="${escapeHtml(getGroupIconName(visuals.group))}"></i></span>
            </div>
            <div class="overlay-visual-tile overlay-visual-item">
              <span class="icon-slot overlay-item-icon"><i data-lucide="${escapeHtml(getBlueprintItemIconName(item))}"></i></span>
            </div>
          </div>
          <div class="overlay-title-block">
            <p class="overlay-eyebrow">${escapeHtml(visuals.group)} / ${escapeHtml(visuals.type || 'Type')}</p>
            <h3 id="blueprint-overlay-title">${escapeHtml(item.name)}</h3>
            <div class="overlay-meta-row">
              <span class="overlay-tier-badge">Tier ${escapeHtml(tierValue)}</span>
              <span class="overlay-group-badge">${escapeHtml(visuals.group)}</span>
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

function renderSavedViews(items = []) {
  ensureSavedFilterViewsLoaded()
  latestSavedViewItems = Array.isArray(items) ? items : []

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
  const starterViewPresets = getVisibleStarterViewPresets()

  savedViewsContentEl.innerHTML = `
    <div class="saved-views-toolbar overlay-card saved-view-chip-panel">
      ${renderActiveSavedViewDeleteControl()}
      <div class="saved-view-chip-wrap">
        <div class="saved-view-presets">
          ${starterViewPresets.map((preset) => `
            <button
              type="button"
              class="saved-view-preset ${activeSavedViewPreset === `starter:${preset.id}` ? 'is-active' : ''}"
              data-starter-view-preset="${escapeHtml(preset.id)}"
            >${escapeHtml(preset.label)}</button>
          `).join('')}
        </div>
        ${renderSavedFilterViews()}
      </div>
    </div>

    <div class="saved-views-toolbar overlay-card">
      <details class="overlay-section" ${isSavedViewFiltersPanelOpen ? 'open' : ''} data-saved-view-filters-panel>
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
                  ['dependent', 'Dependent On'],
                  ['needed', 'Needed For'],
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
                <div class="saved-view-match-description">
                  ${getCollectionBookMatchDescription(savedViewCriteria.collectionBookState)}
                </div>
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
                <span>Select qualities to match</span>
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

  bindSavedViewAccordion()
  bindSavedViewControls()
  renderLucideIcons(savedViewsContentEl)
}

function renderSavedViewResults(items = [], dependencyIndex) {
  if (!items.length) {
    return '<p class="empty-state">No blueprints match this criteria set.</p>'
  }

  const grouped = new Map()

  items.forEach((item) => {
    const group = item?.classification?.group || item?.classification?.category || 'Accessories'
    const type = item?.classification?.type || 'Unknown'

    if (!grouped.has(group)) {
      grouped.set(group, {
        group,
        types: new Map(),
        totalItems: 0,
      })
    }

    const groupBucket = grouped.get(group)
    groupBucket.totalItems += 1

    if (!groupBucket.types.has(type)) {
      groupBucket.types.set(type, {
        type,
        items: [],
      })
    }

    groupBucket.types.get(type).items.push(item)
  })

  const orderedGroupBuckets = Array.from(grouped.values()).sort((leftGroup, rightGroup) => {
    const leftIndex = GROUP_ORDER_INDEX.get(leftGroup.group)
    const rightIndex = GROUP_ORDER_INDEX.get(rightGroup.group)

    if (leftIndex !== undefined && rightIndex !== undefined) {
      return leftIndex - rightIndex
    }

    if (leftIndex !== undefined) {
      return -1
    }

    if (rightIndex !== undefined) {
      return 1
    }

    return leftGroup.group.localeCompare(rightGroup.group)
  })

  return `
    <div class="blueprint-groups saved-view-groups">
      ${orderedGroupBuckets.map((groupBucket) => {
    const typeOrderIndex = GROUP_TYPE_ORDER_INDEX.get(groupBucket.group) || new Map()
    const orderedTypeGroups = Array.from(groupBucket.types.values()).sort((leftTypeGroup, rightTypeGroup) => {
      const leftIndex = typeOrderIndex.get(leftTypeGroup.type)
      const rightIndex = typeOrderIndex.get(rightTypeGroup.type)

      if (leftIndex !== undefined && rightIndex !== undefined) {
        return leftIndex - rightIndex
      }

      if (leftIndex !== undefined) {
        return -1
      }

      if (rightIndex !== undefined) {
        return 1
      }

      return leftTypeGroup.type.localeCompare(rightTypeGroup.type)
    })

    const typeMarkup = orderedTypeGroups.map((typeGroup) => {
      const listMarkup = typeGroup.items.map((item) => {
        const summary = buildBlueprintSummary(item, dependencyIndex, {
          getBlueprintProgressState,
          calculateTotalInventory,
          getCollectionBookStatus,
          getBlueprintMilestoneKeys,
          isTrackedUpgrade,
          getBlueprintMaterials,
        })
        const dependencyText = buildDependencySummaryLine(summary)
        const collectionText = summary.isCollectionComplete ? 'Collection Complete' : `Collection ${summary.collectionStatus || 'Not started'}`
        const ownershipText = summary.isOwned ? 'Owned' : 'Not Owned'

        return `
          <li class="blueprint-item saved-view-item" data-blueprint-name="${escapeHtml(item.name)}">
            <div class="item-copy saved-view-item-copy">
              <div class="item-title-row saved-view-item-title-row">
                <span class="icon-slot item-card-icon" aria-hidden="true"><i data-lucide="${escapeHtml(getBlueprintItemIconName(item))}"></i></span>
                <span class="item-name">${escapeHtml(item.name)}</span>
              </div>
              <div class="saved-view-item-meta">
                <small class="saved-view-item-meta-line">${escapeHtml(`${ownershipText} · Inventory ${summary.totalInventory} · ${collectionText}`)}</small>
                <small class="saved-view-item-meta-line">${escapeHtml(dependencyText)}</small>
              </div>
            </div>
          </li>
        `
      }).join('')

      return `
        <details class="blueprint-type">
          <summary>
            <span class="group-summary-title">
              <span class="icon-slot group-summary-icon" aria-hidden="true"><i data-lucide="${escapeHtml(getTypeIconName(typeGroup.type, groupBucket.group))}"></i></span>
              <span>${escapeHtml(typeGroup.type)}</span>
            </span>
            <span class="group-count">${typeGroup.items.length}</span>
          </summary>
          <ul class="blueprint-items saved-view-items">${listMarkup}</ul>
        </details>
      `
    }).join('')

    return `
      <details class="blueprint-category">
        <summary>
          <span class="group-summary-title">
            <span class="icon-slot group-summary-icon" aria-hidden="true"><i data-lucide="${escapeHtml(getGroupIconName(groupBucket.group))}"></i></span>
            <span>${escapeHtml(groupBucket.group)}</span>
          </span>
          <span class="group-count">${groupBucket.totalItems}</span>
        </summary>
        <div class="category-body">${typeMarkup}</div>
      </details>
    `
      }).join('')}
    </div>
  `
}

function bindSavedViewAccordion() {
  if (!savedViewsContentEl) {
    return
  }

  const categoryNodes = Array.from(savedViewsContentEl.querySelectorAll('.blueprint-category'))
  const typeNodes = Array.from(savedViewsContentEl.querySelectorAll('.blueprint-type'))

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

      typeNodes.forEach((typeNode) => {
        typeNode.open = false
      })
    })
  })

  typeNodes.forEach((node) => {
    node.addEventListener('toggle', () => {
      if (!node.open) {
        return
      }

      typeNodes.forEach((otherNode) => {
        if (otherNode !== node) {
          otherNode.open = false
        }
      })
    })
  })
}

function bindSavedViewControls() {
  if (!savedViewsContentEl) {
    return
  }

  const filtersPanel = savedViewsContentEl.querySelector('[data-saved-view-filters-panel]')
  filtersPanel?.addEventListener('toggle', () => {
    isSavedViewFiltersPanelOpen = filtersPanel.open
  })

  if (hasBoundSavedViewDelegates) {
    return
  }

  savedViewsContentEl.addEventListener('click', (event) => {
    const starterPresetButton = event.target.closest('[data-starter-view-preset]')
    if (starterPresetButton) {
      const presetId = starterPresetButton.dataset.starterViewPreset
      applyStarterViewPreset(presetId, latestSavedViewItems)
      return
    }

    const savedFilterButton = event.target.closest('[data-saved-filter-view-id]')
    if (savedFilterButton) {
      const viewId = savedFilterButton.dataset.savedFilterViewId
      applySavedFilterView(viewId, latestSavedViewItems)
      return
    }

    const deleteActiveViewButton = event.target.closest('[data-delete-active-saved-filter]')
    if (deleteActiveViewButton) {
      deleteActiveSavedViewFilter(latestSavedViewItems)
      return
    }

    const savedViewItem = event.target.closest('.saved-view-item')
    if (savedViewItem) {
      const blueprintName = savedViewItem.getAttribute('data-blueprint-name')
      const item = latestSavedViewItems.find((entry) => entry.name === blueprintName)
      if (item) {
        openBlueprintOverlay(item)
      }
    }
  })

  savedViewsContentEl.addEventListener('change', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return
    }

    const quality = target.dataset.savedFilterBook
    if (quality) {
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
      renderSavedViews(latestSavedViewItems)
      return
    }

    const key = target.dataset.savedFilter
    if (!key) {
      return
    }

    savedViewCriteria = {
      ...savedViewCriteria,
      [key]: target.value,
    }

    activeSavedViewPreset = 'custom'
    renderSavedViews(latestSavedViewItems)
  })

  savedViewsContentEl.addEventListener('input', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) {
      return
    }

    if (target.matches('[data-saved-view-name]')) {
      savedViewDraftName = target.value || ''
    }
  })

  savedViewsContentEl.addEventListener('submit', (event) => {
    const form = event.target
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-save-view-form]')) {
      return
    }

    event.preventDefault()
    const nameInput = form.querySelector('[data-saved-view-name]')
    const saveErrorEl = form.querySelector('[data-save-view-error]')
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
    isSavedViewFiltersPanelOpen = false
    renderSavedViews(latestSavedViewItems)
  })

  hasBoundSavedViewDelegates = true
}

function applyStarterViewPreset(presetId, items = []) {
  const preset = STARTER_VIEW_PRESETS.find((entry) => entry.id === presetId)
  if (!preset) {
    return
  }

  activeSavedViewPreset = `starter:${preset.id}`
  isSavedViewFiltersPanelOpen = false
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
  isSavedViewFiltersPanelOpen = false
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
        <button
          type="button"
          class="saved-view-preset ${activeSavedViewPreset === `saved:${view.id}` ? 'is-active' : ''}"
          data-saved-filter-view-id="${escapeHtml(view.id)}"
        >${escapeHtml(view.name)}</button>
      `).join('')}
    </div>
  `
}

function renderActiveSavedViewDeleteControl() {
  const canDeleteActive = canDeleteActiveSavedViewFilter()
  const activeLabel = getActiveSavedViewLabel()
  const ariaLabel = activeLabel
    ? `Delete active Saved View ${activeLabel}`
    : 'Delete active Saved View'

  return `
    <div class="saved-view-active-controls">
      <span class="saved-view-delete-tip">This X deletes the active Saved View.</span>
      <button
        type="button"
        class="saved-view-delete"
        data-delete-active-saved-filter
        ${canDeleteActive ? '' : 'disabled'}
        aria-label="${escapeHtml(ariaLabel)}"
      >×</button>
    </div>
  `
}

function canDeleteActiveSavedViewFilter() {
  return activeSavedViewPreset.startsWith('saved:') || activeSavedViewPreset.startsWith('starter:')
}

function getVisibleStarterViewPresets() {
  return STARTER_VIEW_PRESETS.filter((preset) => {
    if (hiddenStarterViewPresetIds.has(preset.id)) {
      return false
    }

    const starterSavedViewId = getStarterSavedViewId(preset.id)
    return !savedFilterViews.some((view) => view.id === starterSavedViewId)
  })
}

function getActiveSavedViewLabel() {
  if (activeSavedViewPreset.startsWith('saved:')) {
    const viewId = activeSavedViewPreset.slice('saved:'.length)
    const view = savedFilterViews.find((entry) => entry.id === viewId)
    return view?.name || ''
  }

  if (activeSavedViewPreset.startsWith('starter:')) {
    const presetId = activeSavedViewPreset.slice('starter:'.length)
    const preset = STARTER_VIEW_PRESETS.find((entry) => entry.id === presetId)
    return preset?.label || ''
  }

  return ''
}

function resetSavedViewsToDefaultCriteria() {
  activeSavedViewPreset = 'custom'
  savedViewCriteria = {
    ...DEFAULT_SAVED_VIEW_CRITERIA,
  }
}

function deleteActiveSavedViewFilter(items = []) {
  if (activeSavedViewPreset.startsWith('saved:')) {
    const viewId = activeSavedViewPreset.slice('saved:'.length)
    resetSavedViewsToDefaultCriteria()
    const removed = removeSavedFilterView(viewId)
    if (!removed) {
      renderSavedViews(items)
    }
    return
  }

  if (activeSavedViewPreset.startsWith('starter:')) {
    const presetId = activeSavedViewPreset.slice('starter:'.length)
    hideStarterViewPreset(presetId)
    resetSavedViewsToDefaultCriteria()
    renderSavedViews(items)
  }
}

function renderSelectOptions(options = [], selectedValue = 'any') {
  return options.map(([value, label]) => {
    const selected = value === selectedValue ? 'selected' : ''
    return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(label)}</option>`
  }).join('')
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

function buildDependencyIndex(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return {
      dependentsByComponent: new Map(),
      blueprintNames: new Set(),
    }
  }

  const cached = dependencyIndexCache.get(items)
  if (cached) {
    return cached
  }

  const dependentsByComponent = new Map()
  const blueprintNames = new Set(
    items
      .map((item) => normalizeBlueprintName(item?.name))
      .filter(Boolean),
  )

  items.forEach((item) => {
    const itemName = normalizeBlueprintName(item?.name)
    const components = getBlueprintMaterials(item).components || []

    components.forEach((component) => {
      const componentName = normalizeBlueprintName(component?.name)
      if (!componentName || !blueprintNames.has(componentName) || componentName === itemName) {
        return
      }

      if (!dependentsByComponent.has(componentName)) {
        dependentsByComponent.set(componentName, new Set())
      }

      dependentsByComponent.get(componentName).add(item.name)
    })
  })

  const next = {
    dependentsByComponent,
    blueprintNames,
  }

  dependencyIndexCache.set(items, next)
  return next
}

function filterBlueprintItems(items = [], criteria = {}, dependencyIndex) {
  const normalizedCriteria = normalizeSavedViewCriteria(criteria)

  return items.filter((item) => {
    const summary = buildBlueprintSummary(item, dependencyIndex, {
      getBlueprintProgressState,
      calculateTotalInventory,
      getCollectionBookStatus,
      getBlueprintMilestoneKeys,
      isTrackedUpgrade,
      getBlueprintMaterials,
    })

    if (normalizedCriteria.dependency === 'dependent' && !summary.isDependentOn) {
      return false
    }

    if (normalizedCriteria.dependency === 'needed' && !summary.isNeededFor) {
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

function ensureSavedFilterViewsLoaded() {
  if (hasLoadedSavedFilterViews) {
    return
  }

  savedFilterViews = loadSavedFilterViews()
  if (ensureStarterSavedViewsPresent()) {
    localStorage.setItem(SAVED_FILTER_VIEWS_STORAGE_KEY, JSON.stringify(savedFilterViews))
  }
  hasLoadedSavedFilterViews = true
}

function getStarterSavedViewId(presetId) {
  return `${STARTER_SAVED_VIEW_ID_PREFIX}${presetId}`
}

function ensureStarterSavedViewsPresent() {
  if (!Array.isArray(savedFilterViews)) {
    savedFilterViews = []
  }

  const existingIds = new Set(savedFilterViews.map((view) => view.id))
  let hasChanges = false

  STARTER_VIEW_PRESETS.forEach((preset) => {
    if (hiddenStarterViewPresetIds.has(preset.id)) {
      return
    }

    const starterSavedViewId = getStarterSavedViewId(preset.id)
    if (existingIds.has(starterSavedViewId)) {
      return
    }

    savedFilterViews = [
      {
        id: starterSavedViewId,
        name: preset.label,
        criteria: normalizeSavedViewCriteria({
          ...DEFAULT_SAVED_VIEW_CRITERIA,
          ...preset.criteria,
        }),
      },
      ...savedFilterViews,
    ]
    existingIds.add(starterSavedViewId)
    hasChanges = true
  })

  return hasChanges
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

function removeSavedFilterView(viewId) {
  if (!viewId) {
    return false
  }

  const nextViews = savedFilterViews.filter((entry) => entry.id !== viewId)
  if (nextViews.length === savedFilterViews.length) {
    return false
  }

  savedFilterViews = nextViews
  saveSavedFilterViews()
  return true
}

function saveHiddenStarterViewPresets() {
  localStorage.setItem(HIDDEN_STARTER_VIEW_PRESETS_STORAGE_KEY, JSON.stringify([...hiddenStarterViewPresetIds]))
  scheduleGoogleSyncWrite()
}

function hideStarterViewPreset(presetId) {
  if (!presetId) {
    return false
  }

  const isKnownPreset = STARTER_VIEW_PRESETS.some((preset) => preset.id === presetId)
  if (!isKnownPreset || hiddenStarterViewPresetIds.has(presetId)) {
    return false
  }

  hiddenStarterViewPresetIds = new Set(hiddenStarterViewPresetIds)
  hiddenStarterViewPresetIds.add(presetId)
  saveHiddenStarterViewPresets()
  return true
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

function loadHiddenStarterViewPresetIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(HIDDEN_STARTER_VIEW_PRESETS_STORAGE_KEY) || '[]')
    if (!Array.isArray(stored)) {
      return new Set()
    }

    const validPresetIds = new Set(STARTER_VIEW_PRESETS.map((preset) => preset.id))
    const sanitized = stored
      .map((value) => cleanText(value))
      .filter((value) => validPresetIds.has(value))
    return new Set(sanitized)
  } catch (error) {
    console.warn('Unable to load hidden starter view presets.', error)
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

function persistMilestonesStarforgeStage(blueprintName, encodedValue = '') {
  const [stageType, rawValue] = String(encodedValue || '').split(':')
  const normalizedValue = Number.isFinite(Number(rawValue)) ? Math.max(0, Math.round(Number(rawValue))) : 0
  const progress = getBlueprintProgressState(blueprintName)

  if (stageType === 'starforge') {
    if (!progress?.starforgeUnlocked) {
      saveBlueprintProgressState(blueprintName, { starforge: 0 })
      return
    }

    saveBlueprintProgressState(blueprintName, {
      milestones: Math.max(getBlueprintStageValue(progress, 'milestones'), 5),
      starforge: normalizedValue,
    })
    return
  }

  saveBlueprintProgressState(blueprintName, {
    milestones: normalizedValue,
    starforge: 0,
  })
}

function persistAscensionTranscendenceStage(blueprintName, encodedValue = '') {
  const [stageType, rawValue] = String(encodedValue || '').split(':')
  const normalizedValue = Number.isFinite(Number(rawValue)) ? Math.max(0, Math.round(Number(rawValue))) : 0
  const progress = getBlueprintProgressState(blueprintName)

  if (stageType === 'transcendence') {
    saveBlueprintProgressState(blueprintName, {
      ascension: Math.max(getBlueprintStageValue(progress, 'ascension'), 1),
      transcendence: normalizedValue,
    })
    return
  }

  saveBlueprintProgressState(blueprintName, {
    ascension: normalizedValue,
    transcendence: 0,
  })
}

function persistBlueprintStarforgeUnlock(blueprintName, unlocked) {
  const nextUnlocked = Boolean(unlocked)
  if (!nextUnlocked) {
    saveBlueprintProgressState(blueprintName, {
      starforgeUnlocked: false,
      starforge: 0,
    })
    return
  }

  saveBlueprintProgressState(blueprintName, {
    starforgeUnlocked: true,
  })
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


