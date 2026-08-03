import { buildSupportTicketIssue, validateSupportTicketSubmission } from '../src/supportTicketSchema.js'

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 5
const requestHistoryByIp = new Map()
const MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }

  return req.socket?.remoteAddress || 'unknown'
}

function isRateLimited(ip) {
  const now = Date.now()
  const entries = requestHistoryByIp.get(ip) || []
  const recent = entries.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestHistoryByIp.set(ip, recent)
    return true
  }

  recent.push(now)
  requestHistoryByIp.set(ip, recent)
  return false
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function buildGitHubApiHeaders(token) {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'user-agent': 'shopkeeper-companion-support-form',
  }
}

function sanitizePathSegment(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildScreenshotPath(basePath, fileName, extension) {
  const now = new Date()
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}`
  const randomPart = Math.random().toString(36).slice(2, 8)
  const normalizedName = sanitizePathSegment(fileName.replace(/\.[^/.]+$/, '')) || 'screenshot'
  return `${basePath}/${stamp}-${randomPart}-${normalizedName}.${extension}`
}

async function uploadScreenshotAttachments({ attachments, issueToken, targetRepo, assetPath, assetBranch }) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return []
  }

  const screenshotUrls = []

  for (const attachment of attachments) {
    const extension = MIME_EXTENSION_MAP[attachment.type]
    if (!extension) {
      continue
    }

    const screenshotPath = buildScreenshotPath(assetPath, attachment.name, extension)
    const requestBody = {
      message: `support: upload screenshot ${attachment.name}`,
      content: attachment.content,
    }

    if (assetBranch) {
      requestBody.branch = assetBranch
    }

    const response = await fetch(`https://api.github.com/repos/${targetRepo}/contents/${encodeURIComponent(screenshotPath).replace(/%2F/g, '/')}`, {
      method: 'PUT',
      headers: buildGitHubApiHeaders(issueToken),
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

async function readJsonBody(req) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' })
    return
  }

  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    sendJson(res, 429, { error: 'Too many submissions. Please wait and try again.' })
    return
  }

  let payload
  try {
    payload = await readJsonBody(req)
  } catch (error) {
    sendJson(res, 400, { error: 'Invalid request payload.' })
    return
  }

  const validation = validateSupportTicketSubmission(payload)
  if (!validation.ok) {
    sendJson(res, 400, { error: validation.error })
    return
  }

  const issueToken = process.env.GITHUB_ISSUE_TOKEN || ''
  const targetRepo = process.env.GITHUB_ISSUE_REPO || 'kakita987/Shopkeeper-Companion'
  const assetPath = process.env.GITHUB_ISSUE_ASSET_PATH || 'support-uploads'
  const assetBranch = process.env.GITHUB_ISSUE_ASSET_BRANCH || 'main'

  if (!issueToken) {
    sendJson(res, 503, { error: 'Support ticket endpoint is not configured yet.' })
    return
  }

  try {
    const screenshotUrls = await uploadScreenshotAttachments({
      attachments: validation.value.attachments,
      issueToken,
      targetRepo,
      assetPath,
      assetBranch,
    })

    const issuePayload = buildSupportTicketIssue(validation.value, screenshotUrls)

    const response = await fetch(`https://api.github.com/repos/${targetRepo}/issues`, {
      method: 'POST',
      headers: buildGitHubApiHeaders(issueToken),
      body: JSON.stringify(issuePayload),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      sendJson(res, 502, { error: 'GitHub rejected the submission. Please try GitHub direct link.', details: result?.message || '' })
      return
    }

    sendJson(res, 200, {
      ok: true,
      issueNumber: result.number,
      issueUrl: result.html_url,
    })
  } catch (error) {
    sendJson(res, 502, { error: 'Could not reach GitHub. Please try again later.' })
  }
}
