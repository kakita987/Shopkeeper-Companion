import { getRandomTavernText } from './kofiText.js'

const ETHICAL_ADS_SCRIPT_SRC = 'https://media.ethicalads.io/media/client/ethicalads.min.js'
const ETHICAL_ADS_TIMEOUT_MS = 5000
const KOFI_ICON_URL = 'https://storage.ko-fi.com/cdn/cup-border.png'

let ethicalAdsScriptPromise = null

function loadEthicalAdsScript() {
  if (window.ethicalads || window._ethicalads) {
    return Promise.resolve()
  }

  if (ethicalAdsScriptPromise) {
    return ethicalAdsScriptPromise
  }

  ethicalAdsScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${ETHICAL_ADS_SCRIPT_SRC}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('EthicalAds script failed to load.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = ETHICAL_ADS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('EthicalAds script failed to load.'))
    document.head.appendChild(script)
  })

  return ethicalAdsScriptPromise
}

function hasRenderedAd(slotEl) {
  if (!slotEl) {
    return false
  }

  if (slotEl.querySelector('iframe, ins, [data-ea-publisher], [class*="ethical"], [id*="ethical"]')) {
    return true
  }

  const text = (slotEl.textContent || '').trim()
  return text.length > 0
}

export function mountAdBanner(rootEl, options = {}) {
  if (!rootEl) {
    return () => {}
  }

  const publisher = options.publisher || 'shopkeepercompanion'
  const kofiUrl = options.kofiUrl || 'https://ko-fi.com/shopkeepercompanion'
  const kofiLabel = getRandomTavernText()

  rootEl.innerHTML = `
    <div class="ad-banner-shell" aria-live="polite">
      <p class="ad-banner-label">Sponsored</p>
      <div class="ad-banner-slot" data-ad-slot data-ea-publisher="${publisher}" data-ea-type="image" data-ea-style="stickybox"></div>
      <div class="ad-banner-fallback is-hidden" data-ad-fallback>
        <span class="ad-banner-fallback-copy">Enjoying Shopkeeper Companion?</span>
        <a class="ad-banner-link kofi-link-button" href="${kofiUrl}" target="_blank" rel="noopener noreferrer">
          <img class="kofi-link-icon" src="${KOFI_ICON_URL}" alt="" aria-hidden="true" />
          <span class="kofi-link-text">${kofiLabel}</span>
        </a>
      </div>
    </div>
  `

  const shellEl = rootEl.querySelector('.ad-banner-shell')
  const slotEl = rootEl.querySelector('[data-ad-slot]')
  const fallbackEl = rootEl.querySelector('[data-ad-fallback]')

  let isDisposed = false
  const checkInterval = window.setInterval(() => {
    if (isDisposed) {
      return
    }

    if (hasRenderedAd(slotEl)) {
      window.clearInterval(checkInterval)
      window.clearTimeout(fallbackTimer)
    }
  }, 350)

  function showFallback() {
    if (isDisposed) {
      return
    }

    shellEl?.classList.add('is-fallback')
    fallbackEl?.classList.remove('is-hidden')
    if (slotEl && !hasRenderedAd(slotEl)) {
      slotEl.classList.add('is-hidden')
    }
  }

  const fallbackTimer = window.setTimeout(() => {
    if (!hasRenderedAd(slotEl)) {
      showFallback()
    }
    window.clearInterval(checkInterval)
  }, ETHICAL_ADS_TIMEOUT_MS)

  loadEthicalAdsScript().catch(() => {
    showFallback()
    window.clearInterval(checkInterval)
    window.clearTimeout(fallbackTimer)
  })

  return () => {
    isDisposed = true
    window.clearInterval(checkInterval)
    window.clearTimeout(fallbackTimer)
    rootEl.innerHTML = ''
  }
}
