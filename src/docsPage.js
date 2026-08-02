import './style.css'
import gearIcon from './assets/gearshape.fill.png'
import { initSettingsUi, applyTheme, applyFontPreference, getStoredTheme, getStoredFontPreference } from './settingsUi.js'
import { renderMarkdown } from './markdownRenderer.js'

export function mountDocsPage({ markdown, contentSelector = '#content-markdown' } = {}) {
  const settingsToggle = document.querySelector('#settings-toggle')
  const settingsPanel = document.querySelector('#settings-panel')
  const closeSettingsButton = document.querySelector('#close-settings')
  const themeInputs = document.querySelectorAll('input[name="theme"]')
  const fontSelect = document.querySelector('#font-select')
  const contentEl = document.querySelector(contentSelector)

  if (settingsToggle) {
    settingsToggle.innerHTML = `<img class="settings-toggle-icon" src="${gearIcon}" alt="" aria-hidden="true" />`
  }

  initSettingsUi({
    settingsToggle,
    settingsPanel,
    closeSettingsButton,
    themeInputs,
    fontSelect,
    onThemeChange: (nextTheme) => applyTheme(nextTheme, { themeInputs }),
    onFontChange: (nextFont) => applyFontPreference(nextFont, { fontSelect }),
  })

  applyTheme(getStoredTheme(), { themeInputs })
  applyFontPreference(getStoredFontPreference(), { fontSelect })

  if (contentEl) {
    contentEl.innerHTML = renderMarkdown(markdown)
  }
}
