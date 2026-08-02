import './style.css'
import { mountAdBanner } from './adBanner.js'
import { initSettingsUi, applyTheme, applyFontPreference, getStoredTheme, getStoredFontPreference } from './settingsUi.js'
import { renderMarkdown } from './markdownRenderer.js'
import { SETTINGS_GEAR_ICON_MARKUP } from './settingsGearIcon.js'

let disposeDocsAd = () => {}
const ADS_VISIBLE = import.meta.env.VITE_SHOW_ADS === 'true'

function getCurrentThemeHint() {
  return document.body.classList.contains('theme-dark') ? 'dark' : 'light'
}

function mountDocsAdBanner() {
  const docsAdBannerEl = document.querySelector('#docs-ad-banner')

  disposeDocsAd()

  if (!docsAdBannerEl) {
    return
  }

  disposeDocsAd = mountAdBanner(docsAdBannerEl, {
    publisher: 'shopkeepercompanion',
    kofiUrl: 'https://ko-fi.com/shopkeepercompanion',
    theme: getCurrentThemeHint(),
  })
}

export function mountDocsPage({ markdown, contentSelector = '#content-markdown' } = {}) {
  document.body.classList.add('docs-page')

  const settingsToggle = document.querySelector('#settings-toggle')
  const settingsPanel = document.querySelector('#settings-panel')
  const closeSettingsButton = document.querySelector('#close-settings')
  const themeInputs = document.querySelectorAll('input[name="theme"]')
  const fontSelect = document.querySelector('#font-select')
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
    onThemeChange: (nextTheme) => {
      applyTheme(nextTheme, { themeInputs })
      mountDocsAdBanner()
    },
    onFontChange: (nextFont) => applyFontPreference(nextFont, { fontSelect }),
  })

  applyTheme(getStoredTheme(), { themeInputs })
  applyFontPreference(getStoredFontPreference(), { fontSelect })

  if (contentEl) {
    contentEl.innerHTML = renderMarkdown(markdown)
  }

  mountDocsAdBanner()
}
