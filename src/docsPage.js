import './style.css'
import { getItem, setItem, removeItem } from './storage.js'
import { importBlueprintProgressCsvText, exportBlueprintProgressCsvText } from './blueprintCsv.js'
import { buildBlueprintItems, convertBlueprintRowToObject } from './blueprintParsing.js'
import { initSettingsUi, applyTheme, applyFontPreference, applySizePreference, getStoredTheme, getStoredFontPreference, getStoredSizePreference } from './settingsUi.js'
import { renderMarkdown } from './markdownRenderer.js'
import { SETTINGS_GEAR_ICON_MARKUP } from './settingsGearIcon.js'
import { mountPageAdBanner } from './pageAdBanner.js'

const DEFAULT_SPREADSHEET_URL = 'https://playshoptitans.com/spreadsheet'
const FALLBACK_GOOGLE_SHEET_URL = import.meta.env.VITE_BLUEPRINT_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c/edit'
const BLUEPRINT_CACHE_STORAGE_KEY = 'shopkeeper-blueprint-cache-v1'

let docsPageBlueprintItems = []
let docsPageBlueprintProgress = {}
let docsPageBlueprintVersionLabel = ''

function shouldLoadMainAppView() {
  return window.location.hash === '#blueprints' || window.location.hash === '#saved-views'
}

function maybeLoadMainAppView() {
  if (!shouldLoadMainAppView()) {
    return
  }

  const appRoot = document.querySelector('#app')
  if (!appRoot) {
    return
  }

  if (appRoot.dataset.mainAppLoaded === 'true') {
    return
  }

  appRoot.dataset.mainAppLoaded = 'true'
  import('./main.js')
}

function bindDocsPageTabs() {
  const tabs = Array.from(document.querySelectorAll('.top-tab'))

  tabs.forEach((tab) => {
    tab.addEventListener('click', (event) => {
      const nextHash = tab.dataset.view === 'saved-views' ? '#saved-views' : '#blueprints'

      if (tab instanceof HTMLAnchorElement) {
        event.preventDefault()
      }

      window.location.hash = nextHash
      maybeLoadMainAppView()
    })
  })
}

function renderDocsSettingsStatus(message, tone = 'info') {
  const statusEl = document.querySelector('[data-docs-settings-status]')
  if (!statusEl) {
    return
  }

  statusEl.textContent = message
  statusEl.classList.toggle('sync-error', tone === 'error')
  statusEl.classList.toggle('sync-success', tone === 'success')
}

function ensureDocsSettingsControls() {
  const settingsPanel = document.querySelector('#settings-panel')
  const settingsCard = settingsPanel?.querySelector('.settings-card')
  if (!settingsPanel || !settingsCard) {
    return
  }

  if (settingsCard.querySelector('#import-form')) {
    return
  }

  const importSection = document.createElement('section')
  importSection.className = 'settings-section'
  importSection.dataset.settingsSection = 'import'
  importSection.innerHTML = `
    <form id="import-form" class="import-form compact-form">
      <button type="submit">Import Blueprints</button>
      <p id="blueprint-version" class="settings-copy blueprint-version"></p>
    </form>
    <p class="settings-copy">Bring in the latest blueprint library from the developer spreadsheet whenever it needs a refresh.</p>
    <p class="settings-copy" data-docs-settings-status aria-live="polite"></p>
  `

  const backupSection = document.createElement('section')
  backupSection.className = 'settings-section'
  backupSection.dataset.settingsSection = 'save-progress'
  backupSection.innerHTML = `
    <h3>Save your progress</h3>
    <p class="settings-copy">Your progress is saved in this browser. Download a fresh CSV copy anytime for safekeeping or bulk editing, then upload the edited CSV to apply your changes.</p>
    <div id="progress-backup" class="progress-backup"></div>
  `

  settingsCard.insertBefore(backupSection, settingsCard.lastElementChild)
  settingsCard.insertBefore(importSection, settingsCard.lastElementChild)
}

function normalizeUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim()
  if (!trimmed) {
    return ''
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

async function resolveSpreadsheetUrl(rawUrl) {
  const normalizedUrl = normalizeUrl(rawUrl)

  if (!normalizedUrl) {
    return FALLBACK_GOOGLE_SHEET_URL
  }

  if (!import.meta.env.DEV) {
    if (/docs\.google\.com\/spreadsheets\/d\//i.test(normalizedUrl)) {
      return normalizedUrl
    }

    try {
      const directResponse = await fetch(normalizedUrl, { redirect: 'follow' })
      if (directResponse?.url && /docs\.google\.com\/spreadsheets\/d\//i.test(directResponse.url)) {
        return directResponse.url
      }
    } catch (error) {
      console.warn('Direct spreadsheet URL resolve failed, using fallback URL.', error)
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
  return nextUrl || FALLBACK_GOOGLE_SHEET_URL
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

async function fetchSpreadsheetVersionLabel(resolvedUrl) {
  try {
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

function renderDocsBlueprintVersionLabel(versionLabel) {
  const blueprintVersionEl = document.querySelector('#blueprint-version')
  if (!blueprintVersionEl) {
    return
  }

  if (!versionLabel) {
    blueprintVersionEl.innerHTML = ''
    blueprintVersionEl.hidden = true
    return
  }

  blueprintVersionEl.hidden = false
  blueprintVersionEl.innerHTML = `<strong>${versionLabel}</strong>`
}

function normalizeBlueprintCachePayload(payload) {
  return {
    headers: Array.isArray(payload?.headers) ? payload.headers : [],
    rows: Array.isArray(payload?.rows) ? payload.rows : [],
    structuredBlueprints: Array.isArray(payload?.structuredBlueprints) ? payload.structuredBlueprints : [],
    versionLabel: typeof payload?.versionLabel === 'string' ? payload.versionLabel : '',
  }
}

function saveDocsBlueprintCache(payload) {
  return setItem(BLUEPRINT_CACHE_STORAGE_KEY, normalizeBlueprintCachePayload(payload))
}

async function loadDocsBlueprintCache() {
  try {
    const cached = await getItem(BLUEPRINT_CACHE_STORAGE_KEY)
    if (cached && typeof cached === 'object') {
      return normalizeBlueprintCachePayload(cached)
    }

    const legacy = JSON.parse(localStorage.getItem(BLUEPRINT_CACHE_STORAGE_KEY) || 'null')
    if (legacy && typeof legacy === 'object') {
      localStorage.removeItem(BLUEPRINT_CACHE_STORAGE_KEY)
      const migrated = normalizeBlueprintCachePayload(legacy)
      await saveDocsBlueprintCache(migrated)
      return migrated
    }

    return null
  } catch (error) {
    console.warn('Unable to load cached blueprint data on docs page.', error)
    return null
  }
}

async function initializeDocsBlueprintDataFromCache() {
  const cached = await loadDocsBlueprintCache()
  docsPageBlueprintVersionLabel = cached?.versionLabel || ''
  renderDocsBlueprintVersionLabel(docsPageBlueprintVersionLabel)

  if (!cached) {
    renderDocsSettingsStatus('No blueprint library loaded yet. Import Blueprints to enable offline CSV backups.', 'info')
    return
  }

  const { headers = [], rows = [], structuredBlueprints = [] } = cached
  docsPageBlueprintItems = buildBlueprintItems(headers, rows, structuredBlueprints)
  if (!docsPageBlueprintItems.length) {
    renderDocsSettingsStatus('The cached blueprint library is empty. Import Blueprints to refresh it.', 'error')
    return
  }

  renderDocsSettingsStatus('Blueprint data is ready for CSV export and import.', 'success')
}

async function importDocsBlueprintData() {
  try {
    renderDocsSettingsStatus('Checking the latest Shop Titans spreadsheet link…', 'info')
    const resolvedUrl = await resolveSpreadsheetUrl(DEFAULT_SPREADSHEET_URL)
    const exportUrl = buildExportUrl(resolvedUrl)
    const versionLabel = await fetchSpreadsheetVersionLabel(resolvedUrl)

    renderDocsSettingsStatus('Downloading blueprints…', 'info')
    const { headers, rows, structuredBlueprints } = await importGoogleSheet(exportUrl)
    docsPageBlueprintItems = buildBlueprintItems(headers, rows, structuredBlueprints)
    docsPageBlueprintVersionLabel = versionLabel || docsPageBlueprintVersionLabel

    await saveDocsBlueprintCache({ headers, rows, structuredBlueprints, versionLabel: docsPageBlueprintVersionLabel })
    renderDocsBlueprintVersionLabel(docsPageBlueprintVersionLabel)
    renderDocsSettingsStatus(`Blueprints downloaded (${docsPageBlueprintItems.length} items).`, 'success')
  } catch (error) {
    console.error(error)
    renderDocsSettingsStatus(error.message || 'The spreadsheet could not be imported.', 'error')
  }
}

function initializeDocsCsvBackupUi() {
  const progressBackupContainer = document.querySelector('#progress-backup')
  if (!progressBackupContainer) {
    return
  }

  progressBackupContainer.innerHTML = `
    <div class="progress-backup-actions">
      <button type="button" class="auth-button" data-backup-action="download">Download progress CSV</button>
      <label class="auth-button auth-button-secondary progress-backup-upload">
        Upload edited CSV
        <input type="file" accept=".csv,text/csv" data-backup-input aria-label="Upload edited CSV" />
      </label>
    </div>
    <p class="settings-copy sync-caption" data-backup-status aria-live="polite"></p>
  `

  const downloadButton = progressBackupContainer.querySelector('[data-backup-action="download"]')
  const uploadInput = progressBackupContainer.querySelector('[data-backup-input]')
  const statusElement = progressBackupContainer.querySelector('[data-backup-status]')

  downloadButton?.addEventListener('click', () => {
    const csvText = exportBlueprintProgressCsvText(docsPageBlueprintItems, docsPageBlueprintProgress)
    const dateStamp = new Date().toISOString().slice(0, 10)
    const objectUrl = URL.createObjectURL(new Blob([csvText], { type: 'text/csv;charset=utf-8' }))
    const downloadLink = document.createElement('a')
    downloadLink.href = objectUrl
    downloadLink.download = `shopkeeper-companion-backup-${dateStamp}.csv`
    downloadLink.click()
    URL.revokeObjectURL(objectUrl)

    statusElement.textContent = `Saved a CSV snapshot with ${docsPageBlueprintItems.length} blueprint rows.`
    statusElement.classList.remove('sync-error')
  })

  uploadInput?.addEventListener('change', async () => {
    const selectedFile = uploadInput.files?.[0]
    if (!selectedFile) {
      return
    }

    try {
      const { progress, rowCount } = importBlueprintProgressCsvText(await selectedFile.text(), docsPageBlueprintProgress)
      docsPageBlueprintProgress = progress
      statusElement.textContent = `Applied progress from ${rowCount} blueprint rows.`
      statusElement.classList.remove('sync-error')
    } catch (error) {
      statusElement.textContent = error?.message || 'Unable to import this CSV backup.'
      statusElement.classList.add('sync-error')
    } finally {
      uploadInput.value = ''
    }
  })
}

function bindDocsSettingsActions() {
  const importForm = document.querySelector('#import-form')
  if (importForm) {
    importForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      await importDocsBlueprintData()
    })
  }
}

export function mountDocsPage({ markdown, contentSelector = '#content-markdown' } = {}) {
  document.body.classList.add('docs-page')

  const settingsToggle = document.querySelector('#settings-toggle')
  const settingsPanel = document.querySelector('#settings-panel')
  const closeSettingsButton = document.querySelector('#close-settings')
  const themeInputs = document.querySelectorAll('input[name="theme"]')
  const fontSelect = document.querySelector('#font-select')
  const sizeSlider = document.querySelector('#size-slider')
  const contentEl = document.querySelector(contentSelector)

  if (settingsToggle) {
    settingsToggle.innerHTML = SETTINGS_GEAR_ICON_MARKUP
  }

  ensureDocsSettingsControls()
  initializeDocsCsvBackupUi()
  bindDocsSettingsActions()
  void initializeDocsBlueprintDataFromCache()

  initSettingsUi({
    settingsToggle,
    settingsPanel,
    closeSettingsButton,
    themeInputs,
    fontSelect,
    sizeSlider,
    onThemeChange: (nextTheme) => {
      applyTheme(nextTheme, { themeInputs })
      mountPageAdBanner()
    },
    onFontChange: (nextFont) => applyFontPreference(nextFont, { fontSelect }),
    onSizeChange: (nextSize) => applySizePreference(nextSize, { sizeSlider }),
  })

  applyTheme(getStoredTheme(), { themeInputs })
  applyFontPreference(getStoredFontPreference(), { fontSelect })
  applySizePreference(getStoredSizePreference(), { sizeSlider })

  if (contentEl) {
    contentEl.innerHTML = renderMarkdown(markdown)
  }

  mountPageAdBanner()
  bindDocsPageTabs()
  maybeLoadMainAppView()

  window.addEventListener('hashchange', maybeLoadMainAppView, { once: false })
}
