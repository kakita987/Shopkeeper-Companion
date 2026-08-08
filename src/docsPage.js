import './style.css'
import { initSettingsUi, applyTheme, applyFontPreference, applySizePreference, getStoredTheme, getStoredFontPreference, getStoredSizePreference } from './settingsUi.js'
import { renderMarkdown } from './markdownRenderer.js'
import { SETTINGS_GEAR_ICON_MARKUP } from './settingsGearIcon.js'
import { mountPageAdBanner } from './pageAdBanner.js'

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
}
