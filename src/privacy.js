import './style.css'
import gearIcon from './assets/gearshape.fill.png'

const THEME_PREFERENCE_STORAGE_KEY = 'shopkeeper-theme'
const FONT_PREFERENCE_STORAGE_KEY = 'shopkeeper-font-preference'

const settingsToggle = document.querySelector('#settings-toggle')
const settingsPanel = document.querySelector('#settings-panel')
const closeSettingsButton = document.querySelector('#close-settings')

if (settingsToggle) {
  settingsToggle.innerHTML = `<img class="settings-toggle-icon" src="${gearIcon}" alt="" aria-hidden="true" />`
}
const themeInputs = document.querySelectorAll('input[name="theme"]')
const fontSelect = document.querySelector('#font-select')

function openSettings() {
  settingsPanel.classList.add('is-open')
  settingsPanel.setAttribute('aria-hidden', 'false')
  settingsToggle.setAttribute('aria-expanded', 'true')
  document.body.classList.add('settings-open')
}

function closeSettings() {
  settingsPanel.classList.remove('is-open')
  settingsPanel.setAttribute('aria-hidden', 'true')
  settingsToggle.setAttribute('aria-expanded', 'false')
  document.body.classList.remove('settings-open')
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
  if (event.key === 'Escape' && settingsPanel.classList.contains('is-open')) {
    closeSettings()
  }
})

themeInputs.forEach((input) => {
  input.addEventListener('change', () => applyTheme(input.value))
})

fontSelect.addEventListener('change', (event) => {
  applyFontPreference(event.currentTarget.value)
})

function applyTheme(theme) {
  const resolvedTheme = theme === 'light' || theme === 'dark' ? theme : 'device'
  const isDark =
    resolvedTheme === 'dark' ||
    (resolvedTheme === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  document.documentElement.dataset.theme = resolvedTheme
  document.body.classList.toggle('theme-dark', isDark)
  document.body.classList.toggle('theme-light', !isDark)

  const selectedInput = Array.from(themeInputs).find((input) => input.value === resolvedTheme)
  if (selectedInput) {
    selectedInput.checked = true
  }

  localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, resolvedTheme)
}

function applyFontPreference(fontPreference) {
  const resolvedFont = ['default', 'serif', 'sans'].includes(fontPreference)
    ? fontPreference
    : 'default'
  document.documentElement.dataset.fontPreference = resolvedFont

  if (fontSelect) {
    fontSelect.value = resolvedFont
  }

  localStorage.setItem(FONT_PREFERENCE_STORAGE_KEY, resolvedFont)
}

applyTheme(localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY) || 'device')
applyFontPreference(localStorage.getItem(FONT_PREFERENCE_STORAGE_KEY) || 'default')
