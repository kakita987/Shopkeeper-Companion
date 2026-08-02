import markdown from './content/about.md?raw'
import { initAnalytics } from './analytics.js'
import { mountDocsPage } from './docsPage.js'

mountDocsPage({ markdown })
initAnalytics({ trackInitialView: true })