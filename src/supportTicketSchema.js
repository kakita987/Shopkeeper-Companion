const MAX_SUMMARY_LENGTH = 140
const MAX_FIELD_LENGTH = 4000
export const MAX_ATTACHMENT_COUNT = 3
export const MAX_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024
export const ALLOWED_ATTACHMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const SUPPORT_TICKET_TYPES = {
  bug: {
    label: 'Bug Report',
    titlePrefix: '[Bug] ',
    githubLabel: 'bug',
    fields: [
      { key: 'issue', label: 'Describe the issue', required: true, prompt: 'What happened?' },
      { key: 'steps', label: 'Steps to reproduce', required: true, prompt: '1.\n2.\n3.' },
      { key: 'expected', label: 'Expected behavior', required: true, prompt: 'What did you expect to happen?' },
      { key: 'additional', label: 'Additional information', required: true, prompt: 'Browser:\nDevice:\nAny other details:' },
    ],
  },
  feature: {
    label: 'Feature Request',
    titlePrefix: '[Feature] ',
    githubLabel: 'enhancement',
    fields: [
      { key: 'feature', label: 'Describe the feature', required: true, prompt: 'What would you like to see added?' },
      { key: 'useful', label: 'Why would this be useful?', required: true, prompt: 'Explain how this would improve the app.' },
      { key: 'additional', label: 'Additional details', required: true, prompt: 'Anything else?' },
    ],
  },
  documentation: {
    label: 'Documentation Request',
    titlePrefix: '[Documentation] ',
    githubLabel: 'documentation',
    fields: [
      { key: 'needs', label: 'What documentation needs improvement?', required: true, prompt: 'Describe what is missing, unclear, or difficult to find.' },
      { key: 'where', label: 'Where did you encounter this?', required: true, prompt: 'Include the page, section, or feature where documentation could be improved.' },
      { key: 'suggested', label: 'Suggested improvement', required: true, prompt: 'Describe what information should be added or changed.' },
      { key: 'additional', label: 'Additional information', required: true, prompt: 'Add screenshots, examples, or any other helpful details.' },
    ],
  },
  question: {
    label: 'Question',
    titlePrefix: '[Question] ',
    githubLabel: 'question',
    fields: [
      { key: 'help', label: 'What would you like help with?', required: true, prompt: 'Describe what you are trying to do or understand.' },
      { key: 'tried', label: 'What have you tried?', required: true, prompt: 'Include any steps you have already taken.' },
      { key: 'additional', label: 'Additional information', required: true, prompt: 'Add screenshots or any other details that may help.' },
    ],
  },
}

function normalizeString(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.replace(/\r\n?/g, '\n').trim()
}

function normalizeAttachmentName(value) {
  const normalized = normalizeString(value)
  if (!normalized) {
    return ''
  }

  return normalized.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120)
}

function validateAttachments(input) {
  if (!Array.isArray(input)) {
    return { ok: true, value: [] }
  }

  if (input.length > MAX_ATTACHMENT_COUNT) {
    return { ok: false, error: `Maximum ${MAX_ATTACHMENT_COUNT} screenshots allowed.` }
  }

  const attachments = []
  for (let index = 0; index < input.length; index += 1) {
    const item = input[index]
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Invalid screenshot data.' }
    }

    const name = normalizeAttachmentName(item.name)
    const type = normalizeString(item.type)
    const content = normalizeString(item.content)
    const sizeBytes = Number.isFinite(item.sizeBytes) ? Math.trunc(item.sizeBytes) : -1

    if (!name) {
      return { ok: false, error: `Screenshot ${index + 1} needs a filename.` }
    }

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(type)) {
      return { ok: false, error: `Screenshot ${index + 1} has an unsupported format.` }
    }

    if (sizeBytes <= 0 || sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
      return { ok: false, error: `Screenshot ${index + 1} exceeds the 2 MB limit.` }
    }

    if (!content || !/^[A-Za-z0-9+/=]+$/.test(content)) {
      return { ok: false, error: `Screenshot ${index + 1} has invalid image data.` }
    }

    attachments.push({
      name,
      type,
      content,
      sizeBytes,
    })
  }

  return { ok: true, value: attachments }
}

export function getSupportTicketType(type) {
  return SUPPORT_TICKET_TYPES[type] || null
}

export function validateSupportTicketSubmission(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
  const type = normalizeString(payload.type)
  const summary = normalizeString(payload.summary)
  const honeypot = normalizeString(payload.honeypot)
  const definition = getSupportTicketType(type)

  if (!definition) {
    return { ok: false, error: 'Choose a valid ticket type.' }
  }

  if (!summary) {
    return { ok: false, error: 'Add a short summary.' }
  }

  if (summary.length > MAX_SUMMARY_LENGTH) {
    return { ok: false, error: `Summary must be ${MAX_SUMMARY_LENGTH} characters or fewer.` }
  }

  if (honeypot) {
    return { ok: false, error: 'Submission rejected.' }
  }

  const fieldsInput = payload.fields && typeof payload.fields === 'object' ? payload.fields : {}
  const fields = {}

  for (const field of definition.fields) {
    const value = normalizeString(fieldsInput[field.key])
    if (field.required && !value) {
      return { ok: false, error: `Complete the "${field.label}" section.` }
    }

    if (value.length > MAX_FIELD_LENGTH) {
      return { ok: false, error: `"${field.label}" is too long.` }
    }

    fields[field.key] = value
  }

  const sourcePage = normalizeString(payload.sourcePage)
  const userAgent = normalizeString(payload.userAgent)
  const attachmentsValidation = validateAttachments(payload.attachments)

  if (!attachmentsValidation.ok) {
    return attachmentsValidation
  }

  return {
    ok: true,
    value: {
      type,
      summary,
      fields,
      attachments: attachmentsValidation.value,
      sourcePage,
      userAgent,
      definition,
    },
  }
}

export function buildSupportTicketIssue(validatedTicket, screenshotUrls = []) {
  const { definition, summary, fields, sourcePage, userAgent } = validatedTicket
  const title = `${definition.titlePrefix}${summary}`

  const bodySections = definition.fields.map((field) => {
    const value = fields[field.key] || '_No details provided._'
    return `## ${field.label}\n\n${value}`
  })

  if (Array.isArray(screenshotUrls) && screenshotUrls.length > 0) {
    const screenshotLines = screenshotUrls
      .filter((url) => typeof url === 'string' && url.trim())
      .map((url) => `![Screenshot](${url})`)

    if (screenshotLines.length > 0) {
      bodySections.push('## Screenshots')
      bodySections.push(screenshotLines.join('\n\n'))
    }
  }

  bodySections.push('## Submission context')
  bodySections.push(`Submitted from: ${sourcePage || 'Unknown page'}`)
  bodySections.push(`User agent: ${userAgent || 'Unknown agent'}`)

  return {
    title,
    body: bodySections.join('\n\n'),
    labels: [definition.githubLabel],
  }
}
