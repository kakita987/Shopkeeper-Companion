import { mountAdBanner } from './adBanner.js'

let disposePageAd = () => {}

export function mountPageAdBanner({ selector = '#docs-ad-banner', publisher = 'shopkeepercompanion', kofiUrl = 'https://ko-fi.com/shopkeepercompanion' } = {}) {
  const adBannerEl = document.querySelector(selector)

  disposePageAd()

  if (!adBannerEl) {
    return
  }

  disposePageAd = mountAdBanner(adBannerEl, {
    publisher,
    kofiUrl,
    theme: document.body.classList.contains('theme-dark') ? 'dark' : 'light',
  })
}