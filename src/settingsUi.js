const THEME_PREFERENCE_STORAGE_KEY = 'shopkeeper-theme'
const FONT_PREFERENCE_STORAGE_KEY = 'shopkeeper-font-preference'
const SIZE_PREFERENCE_STORAGE_KEY = 'shopkeeper-size-preference'
const SIZE_PREFERENCES = ['small', 'medium', 'large']

function getSizeIndex(sizePreference) {
  const sizeIndex = SIZE_PREFERENCES.indexOf(sizePreference)
  return sizeIndex === -1 ? 1 : sizeIndex
}

function updateSizeSliderProgress(sizeSlider, sliderValue) {
  const normalizedValue = Math.min(2, Math.max(0, Number(sliderValue) || 0))
  const progress = `${normalizedValue * 50}%`
  sizeSlider.parentElement?.style?.setProperty('--size-progress', progress)
}

function getCommittedSizePreference(sizeSlider) {
  const appliedSize = document.documentElement.dataset.sizePreference
  if (SIZE_PREFERENCES.includes(appliedSize)) {
    return appliedSize
  }

  return SIZE_PREFERENCES[Math.round(Number(sizeSlider.value))] || 'medium'
}

export function initSettingsUi({
  settingsToggle,
  settingsPanel,
  closeSettingsButton,
  themeInputs = [],
  fontSelect,
  sizeSlider,
  onThemeChange,
  onFontChange,
  onSizeChange,
  onEscape,
} = {}) {
  const settingsCard = settingsPanel ? settingsPanel.querySelector('.settings-card') : null

  // Shifts the card so the close button lands exactly where the gear icon is on screen.
  function alignCardWithToggle() {
    if (!settingsCard || !settingsToggle || !closeSettingsButton) {
      return
    }

    // Clear any previous offset first so the rects below reflect the card's natural position.
    settingsCard.style.transform = ''

    const toggleRect = settingsToggle.getBoundingClientRect()
    const closeRect = closeSettingsButton.getBoundingClientRect()
    const cardRect = settingsCard.getBoundingClientRect()
    const panelRect = settingsPanel.getBoundingClientRect()

    if (toggleRect.width === 0 || closeRect.width === 0) {
      return
    }

    const panelStyle = window.getComputedStyle(settingsPanel)
    const panelLeft = panelRect.left + (Number.parseFloat(panelStyle.paddingLeft) || 0)
    const panelRight = panelRect.right - (Number.parseFloat(panelStyle.paddingRight) || 0)
    const panelTop = panelRect.top + (Number.parseFloat(panelStyle.paddingTop) || 0)
    const panelBottom = panelRect.bottom - (Number.parseFloat(panelStyle.paddingBottom) || 0)
    const requestedDeltaX = toggleRect.right - closeRect.right
    const requestedDeltaY = toggleRect.top - closeRect.top
    const deltaX = Math.min(
      panelRight - cardRect.right,
      Math.max(panelLeft - cardRect.left, requestedDeltaX)
    )
    const deltaY = Math.min(
      panelBottom - cardRect.bottom,
      Math.max(panelTop - cardRect.top, requestedDeltaY)
    )
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

  if (sizeSlider) {
    sizeSlider.addEventListener('input', () => {
      const selectedIndex = Math.min(2, Math.max(0, Math.round(Number(sizeSlider.value) || 0)))
      const committedSize = getCommittedSizePreference(sizeSlider)
      const nextSize = SIZE_PREFERENCES[selectedIndex]
      sizeSlider.value = String(selectedIndex)
      updateSizeSliderProgress(sizeSlider, selectedIndex)

      if (nextSize !== committedSize && typeof onSizeChange === 'function') {
        onSizeChange(nextSize)
      }
    })

    sizeSlider.addEventListener('keydown', (event) => {
      const committedIndex = getSizeIndex(getCommittedSizePreference(sizeSlider))
      let nextIndex = committedIndex

      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'PageDown') {
        nextIndex = Math.max(0, committedIndex - 1)
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'PageUp') {
        nextIndex = Math.min(SIZE_PREFERENCES.length - 1, committedIndex + 1)
      } else if (event.key === 'Home') {
        nextIndex = 0
      } else if (event.key === 'End') {
        nextIndex = SIZE_PREFERENCES.length - 1
      } else {
        return
      }

      event.preventDefault()
      if (nextIndex !== committedIndex && typeof onSizeChange === 'function') {
        onSizeChange(SIZE_PREFERENCES[nextIndex])
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

export function applySizePreference(sizePreference, { sizeSlider } = {}) {
  const resolvedSize = SIZE_PREFERENCES.includes(sizePreference) ? sizePreference : 'medium'
  document.documentElement.dataset.sizePreference = resolvedSize

  if (sizeSlider) {
    const sizeIndex = getSizeIndex(resolvedSize)
    sizeSlider.value = String(sizeIndex)
    updateSizeSliderProgress(sizeSlider, sizeIndex)
    sizeSlider.setAttribute('aria-valuetext', resolvedSize[0].toUpperCase() + resolvedSize.slice(1))
  }

  localStorage.setItem(SIZE_PREFERENCE_STORAGE_KEY, resolvedSize)
}

export function getStoredTheme() {
  return localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY) || 'device'
}

export function getStoredFontPreference() {
  return localStorage.getItem(FONT_PREFERENCE_STORAGE_KEY) || 'default'
}

export function getStoredSizePreference() {
  const storedSize = localStorage.getItem(SIZE_PREFERENCE_STORAGE_KEY)
  return SIZE_PREFERENCES.includes(storedSize) ? storedSize : 'medium'
}
