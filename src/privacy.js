import markdown from './content/privacy-policy.md?raw'
import { initAnalytics } from './analytics.js'
import { mountDocsPage } from './docsPage.js'

mountDocsPage({ markdown })
initAnalytics({ trackInitialView: true })
