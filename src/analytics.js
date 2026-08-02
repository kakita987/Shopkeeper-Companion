import { inject, pageview } from '@vercel/analytics'

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

  if (trackInitialView) {
    recordView()
  }
}

export function recordView(path = `${window.location.pathname}${window.location.hash}`) {
  pageview({ path })
}