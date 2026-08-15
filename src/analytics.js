import { inject, pageview } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'

let hasInitializedAnalytics = false

export function initAnalytics({ trackInitialView = false } = {}) {
  if (hasInitializedAnalytics) {
    if (trackInitialView) {
      recordView()
    }
    return
  }

  hasInitializedAnalytics = true
  inject({ disableAutoTrack: true })
  injectSpeedInsights()

  if (trackInitialView) {
    recordView()
  }
}

export function recordView(path = `${window.location.pathname}${window.location.hash}`) {
  pageview({ path })
}