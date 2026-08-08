const THEME_PREFERENCE_STORAGE_KEY = 'shopkeeper-theme'
const FONT_PREFERENCE_STORAGE_KEY = 'shopkeeper-font-preference'

export function initSettingsUi({
  settingsToggle,
  settingsPanel,
  closeSettingsButton,
  themeInputs = [],
  fontSelect,
  onThemeChange,
  onFontChange,
  onEscape,
} = {}) {
  const settingsCard = settingsPanel ? settingsPanel.querySelector('.settings-card') : null
  const mobileLayoutQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 700px)')
    : null

  // Shifts the card so the close button lands exactly where the gear icon is on screen.
  // Skipped on narrow viewports, where the panel is intentionally centered instead.
  function alignCardWithToggle() {
    if (!settingsCard || !settingsToggle || !closeSettingsButton) {
      return
    }

    if (mobileLayoutQuery && mobileLayoutQuery.matches) {
      settingsCard.style.transform = ''
      return
    }

    // Clear any previous offset first so the rects below reflect the card's natural position.
    settingsCard.style.transform = ''

    const toggleRect = settingsToggle.getBoundingClientRect()
    const closeRect = closeSettingsButton.getBoundingClientRect()

    if (toggleRect.width === 0 || closeRect.width === 0) {
      return
    }

    const deltaX = toggleRect.right - closeRect.right
    const deltaY = toggleRect.top - closeRect.top
    settingsCard.style.transform = `translate(${deltaX}px, ${deltaY}px)`
  }

  function openSettings() {
    if (!settingsPanel || !settingsToggle) {
      return
    }

    settingsPanel.classList.add('is-open')
    settingsPanel.setAttribute('aria-hidden', 'false')
    settingsToggle.setAttribute('aria-expanded', 'true')
    document.body.classList.add('settings-open')
    alignCardWithToggle()
  }

  function closeSettings() {
    if (!settingsPanel || !settingsToggle) {
      return
    }

    settingsPanel.classList.remove('is-open')
    settingsPanel.setAttribute('aria-hidden', 'true')
    settingsToggle.setAttribute('aria-expanded', 'false')
    document.body.classList.remove('settings-open')
  }

  if (settingsToggle && settingsPanel) {
    settingsToggle.addEventListener('click', () => {
      if (settingsPanel.classList.contains('is-open')) {
        closeSettings()
      } else {
        openSettings()
      }
    })

    settingsPanel.addEventListener('click', (event) => {
      if (event.target === settingsPanel) {
        closeSettings()
      }
    })

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') {
        return
      }

      if (settingsPanel.classList.contains('is-open')) {
        closeSettings()
      } else if (typeof onEscape === 'function') {
        onEscape()
      }
    })

    window.addEventListener('resize', () => {
      if (settingsPanel.classList.contains('is-open')) {
        alignCardWithToggle()
      }
    })
  }

  if (closeSettingsButton) {
    closeSettingsButton.addEventListener('click', closeSettings)
  }

  Array.from(themeInputs || []).forEach((input) => {
    input.addEventListener('change', () => {
      if (typeof onThemeChange === 'function') {
        onThemeChange(input.value)
      }
    })
  })

  if (fontSelect) {
    fontSelect.addEventListener('change', (event) => {
      if (typeof onFontChange === 'function') {
        onFontChange(event.currentTarget.value)
      }
    })
  }

  return {
    openSettings,
    closeSettings,
  }
}

export function applyTheme(theme, { themeInputs = [] } = {}) {
  const resolvedTheme = theme === 'light' || theme === 'dark' ? theme : 'device'
  const isDark = resolvedTheme === 'dark' || (resolvedTheme === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  document.documentElement.dataset.theme = resolvedTheme
  document.body.classList.toggle('theme-dark', isDark)
  document.body.classList.toggle('theme-light', !isDark)

  const selectedInput = Array.from(themeInputs || []).find((input) => input.value === resolvedTheme)
  if (selectedInput) {
    selectedInput.checked = true
  }

  localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, resolvedTheme)
}

export function applyFontPreference(fontPreference, { fontSelect } = {}) {
  const resolvedFont = ['default', 'serif', 'sans'].includes(fontPreference) ? fontPreference : 'default'
  document.documentElement.dataset.fontPreference = resolvedFont

  if (fontSelect) {
    fontSelect.value = resolvedFont
  }

  localStorage.setItem(FONT_PREFERENCE_STORAGE_KEY, resolvedFont)
}

export function getStoredTheme() {
  return localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY) || 'device'
}

export function getStoredFontPreference() {
  return localStorage.getItem(FONT_PREFERENCE_STORAGE_KEY) || 'default'
}
