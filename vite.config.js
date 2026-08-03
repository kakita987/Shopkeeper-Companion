import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import { buildSupportTicketIssue, validateSupportTicketSubmission } from './src/supportTicketSchema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const issueRequestHistoryByIp = new Map()
const ISSUE_RATE_LIMIT_WINDOW_MS = 60 * 1000
const ISSUE_RATE_LIMIT_MAX_REQUESTS = 5
const ISSUE_MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function isIssueRequestRateLimited(ip) {
  const now = Date.now()
  const entries = issueRequestHistoryByIp.get(ip) || []
  const recent = entries.filter((timestamp) => now - timestamp < ISSUE_RATE_LIMIT_WINDOW_MS)

  if (recent.length >= ISSUE_RATE_LIMIT_MAX_REQUESTS) {
    issueRequestHistoryByIp.set(ip, recent)
    return true
  }

  recent.push(now)
  issueRequestHistoryByIp.set(ip, recent)
  return false
}

function getIssueRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }

  return req.socket?.remoteAddress || 'unknown'
}

async function readJsonRequest(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) {
    return {}
  }

  return JSON.parse(raw)
}

function sendJsonResponse(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function buildIssueGitHubHeaders(token) {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'user-agent': 'shopkeeper-companion-support-form-dev',
  }
}

function sanitizeIssuePathSegment(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildIssueScreenshotPath(basePath, fileName, extension) {
  const now = new Date()
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}`
  const randomPart = Math.random().toString(36).slice(2, 8)
  const normalizedName = sanitizeIssuePathSegment(fileName.replace(/\.[^/.]+$/, '')) || 'screenshot'
  return `${basePath}/${stamp}-${randomPart}-${normalizedName}.${extension}`
}

async function uploadIssueScreenshots({ attachments, issueToken, targetRepo, assetPath, assetBranch }) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return []
  }

  const screenshotUrls = []

  for (const attachment of attachments) {
    const extension = ISSUE_MIME_EXTENSION_MAP[attachment.type]
    if (!extension) {
      continue
    }

    const screenshotPath = buildIssueScreenshotPath(assetPath, attachment.name, extension)
    const requestBody = {
      message: `support: upload screenshot ${attachment.name}`,
      content: attachment.content,
    }

    if (assetBranch) {
      requestBody.branch = assetBranch
    }

    const response = await fetch(`https://api.github.com/repos/${targetRepo}/contents/${encodeURIComponent(screenshotPath).replace(/%2F/g, '/')}`, {
      method: 'PUT',
      headers: buildIssueGitHubHeaders(issueToken),
      body: JSON.stringify(requestBody),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result?.message || `Failed to upload ${attachment.name}.`)
    }

    const screenshotUrl = result?.content?.download_url
    if (typeof screenshotUrl === 'string' && screenshotUrl.length > 0) {
      screenshotUrls.push(screenshotUrl)
    }
  }

  return screenshotUrls
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        bulkEdit: resolve(__dirname, 'bulk-edit.html'),
        about: resolve(__dirname, 'about.html'),
        support: resolve(__dirname, 'support.html'),
      },
    },
  },
  plugins: [
    {
      name: 'spreadsheet-proxy',
      configureServer(server) {
        server.middlewares.use('/api/resolve', async (req, res, next) => {
          if (req.method !== 'GET') {
            next()
            return
          }

          const requestUrl = new URL(req.url || '/', 'http://localhost')
          const targetUrl = requestUrl.searchParams.get('url')

          if (!targetUrl) {
            res.statusCode = 400
            res.end('Missing url query parameter.')
            return
          }

          try {
            const response = await fetch(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0',
              },
              redirect: 'manual',
            })

            const finalUrl = response.headers.get('location') || response.url
            res.statusCode = 200
            res.setHeader('content-type', 'text/plain; charset=utf-8')
            res.end(finalUrl || targetUrl)
          } catch (error) {
            res.statusCode = 500
            res.end(error instanceof Error ? error.message : 'Unable to resolve spreadsheet URL.')
          }
        })

        server.middlewares.use('/api/spreadsheet', async (req, res, next) => {
          if (req.method !== 'GET') {
            next()
            return
          }

          const requestUrl = new URL(req.url || '/', 'http://localhost')
          const sheetUrl = requestUrl.searchParams.get('url')

          if (!sheetUrl) {
            res.statusCode = 400
            res.end('Missing url query parameter.')
            return
          }

          try {
            const response = await fetch(sheetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0',
              },
            })

            res.statusCode = response.status
            response.headers.forEach((value, key) => {
              // fetch() already decompresses the body, so drop headers describing the original transfer encoding.
              if (key === 'content-length' || key === 'content-encoding' || key === 'transfer-encoding') {
                return
              }
              res.setHeader(key, value)
            })

            const body = await response.text()
            res.end(body)
          } catch (error) {
            res.statusCode = 500
            res.end(error instanceof Error ? error.message : 'Unable to proxy spreadsheet request.')
          }
        })

        server.middlewares.use('/api/submit-issue', async (req, res, next) => {
          if (req.method !== 'POST') {
            next()
            return
          }

          const ip = getIssueRequestIp(req)
          if (isIssueRequestRateLimited(ip)) {
            sendJsonResponse(res, 429, { error: 'Too many submissions. Please wait and try again.' })
            return
          }

          let payload
          try {
            payload = await readJsonRequest(req)
          } catch (error) {
            sendJsonResponse(res, 400, { error: 'Invalid request payload.' })
            return
          }

          const validation = validateSupportTicketSubmission(payload)
          if (!validation.ok) {
            sendJsonResponse(res, 400, { error: validation.error })
            return
          }

          const issueToken = process.env.GITHUB_ISSUE_TOKEN || ''
          const targetRepo = process.env.GITHUB_ISSUE_REPO || 'kakita987/Shopkeeper-Companion'
          const assetPath = process.env.GITHUB_ISSUE_ASSET_PATH || 'support-uploads'
          const assetBranch = process.env.GITHUB_ISSUE_ASSET_BRANCH || 'main'

          if (!issueToken) {
            sendJsonResponse(res, 503, { error: 'Support ticket endpoint is not configured yet.' })
            return
          }

          try {
            const screenshotUrls = await uploadIssueScreenshots({
              attachments: validation.value.attachments,
              issueToken,
              targetRepo,
              assetPath,
              assetBranch,
            })

            const issuePayload = buildSupportTicketIssue(validation.value, screenshotUrls)

            const response = await fetch(`https://api.github.com/repos/${targetRepo}/issues`, {
              method: 'POST',
              headers: buildIssueGitHubHeaders(issueToken),
              body: JSON.stringify(issuePayload),
            })

            const result = await response.json().catch(() => ({}))
            if (!response.ok) {
              sendJsonResponse(res, 502, { error: 'GitHub rejected the submission. Please try GitHub direct link.', details: result?.message || '' })
              return
            }

            sendJsonResponse(res, 200, {
              ok: true,
              issueNumber: result.number,
              issueUrl: result.html_url,
            })
          } catch (error) {
            sendJsonResponse(res, 502, { error: 'Could not reach GitHub. Please try again later.' })
          }
        })
      },
    },
  ],
})
