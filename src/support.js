import './style.css'
import { initAnalytics } from './analytics.js'
import { initSettingsUi, applyTheme, applyFontPreference, getStoredTheme, getStoredFontPreference } from './settingsUi.js'
import { SETTINGS_GEAR_ICON_MARKUP } from './settingsGearIcon.js'
import { ALLOWED_ATTACHMENT_MIME_TYPES, getSupportTicketType, MAX_ATTACHMENT_COUNT, MAX_ATTACHMENT_SIZE_BYTES, validateSupportTicketSubmission } from './supportTicketSchema.js'
import { mountPageAdBanner } from './pageAdBanner.js'

const GITHUB_ISSUE_CHOOSE_URL = 'https://github.com/kakita987/Shopkeeper-Companion/issues/new/choose'
const FILE_ACCEPT_ATTRIBUTE = ALLOWED_ATTACHMENT_MIME_TYPES.join(',')

function bytesToMb(value) {
  return (value / (1024 * 1024)).toFixed(0)
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

async function buildAttachmentPayloads(fileInput) {
  const files = Array.from(fileInput?.files || [])
  if (files.length === 0) {
    return []
  }

  if (files.length > MAX_ATTACHMENT_COUNT) {
    throw new Error(`You can upload up to ${MAX_ATTACHMENT_COUNT} screenshots.`)
  }

  const attachments = []
  for (const file of files) {
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
      throw new Error(`${file.name} is not a supported image type.`)
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new Error(`${file.name} is larger than ${bytesToMb(MAX_ATTACHMENT_SIZE_BYTES)} MB.`)
    }

    attachments.push({
      name: file.name,
      type: file.type,
      sizeBytes: file.size,
      content: await toBase64(file),
    })
  }

  return attachments
}

function renderSupportForm(rootEl) {
  if (!rootEl) {
    return
  }

  rootEl.innerHTML = `
    <div class="support-page-intro">
      <h3>Submit a Ticket</h3>
      <p>Send feedback, bug reports, and questions directly from this page. No GitHub login is required for this form.</p>
      <p>If you prefer GitHub's full issue workflow, use <a class="inline-link" href="${GITHUB_ISSUE_CHOOSE_URL}" target="_blank" rel="noopener noreferrer">Open on GitHub</a>.</p>
    </div>

    <form id="support-ticket-form" class="support-ticket-form" novalidate>
      <label class="support-field">
        <span>Ticket type</span>
        <select id="support-ticket-type" name="type" required>
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
          <option value="documentation">Documentation Request</option>
          <option value="question">Question</option>
        </select>
      </label>

      <label class="support-field">
        <span>Summary</span>
        <input id="support-ticket-summary" name="summary" type="text" maxlength="140" placeholder="Short title for your ticket" required />
      </label>

      <div id="support-ticket-fields" class="support-ticket-fields"></div>

      <label class="support-field">
        <span>Screenshots (optional)</span>
        <input id="support-ticket-attachments" type="file" accept="${FILE_ACCEPT_ATTRIBUTE}" multiple />
        <small class="support-field-helper">Up to ${MAX_ATTACHMENT_COUNT} images, ${bytesToMb(MAX_ATTACHMENT_SIZE_BYTES)} MB each. PNG, JPG, GIF, and WEBP are supported.</small>
        <small id="support-selected-files" class="support-selected-files"></small>
      </label>

      <label class="support-honeypot" aria-hidden="true">
        <span>Leave this empty</span>
        <input type="text" name="website" autocomplete="off" tabindex="-1" />
      </label>

      <div class="support-actions">
        <button type="submit">Submit Ticket</button>
      </div>

      <p id="support-submit-status" class="status" aria-live="polite"></p>
    </form>
  `

  const formEl = rootEl.querySelector('#support-ticket-form')
  const typeSelectEl = rootEl.querySelector('#support-ticket-type')
  const summaryInputEl = rootEl.querySelector('#support-ticket-summary')
  const fieldsContainerEl = rootEl.querySelector('#support-ticket-fields')
  const attachmentsInputEl = rootEl.querySelector('#support-ticket-attachments')
  const selectedFilesEl = rootEl.querySelector('#support-selected-files')
  const statusEl = rootEl.querySelector('#support-submit-status')
  const submitButtonEl = formEl?.querySelector('button[type="submit"]')

  function updateSelectedFilesLabel() {
    if (!selectedFilesEl) {
      return
    }

    const files = Array.from(attachmentsInputEl?.files || [])
    selectedFilesEl.textContent = files.length > 0
      ? files.map((file) => file.name).join(', ')
      : ''
  }

  function renderTypeFields(type) {
    const definition = getSupportTicketType(type)
    if (!definition || !fieldsContainerEl) {
      return
    }

    fieldsContainerEl.innerHTML = definition.fields.map((field) => {
      return `
        <label class="support-field">
          <span>${field.label}</span>
          <textarea name="field-${field.key}" rows="4" maxlength="4000" placeholder="${field.prompt}" required></textarea>
        </label>
      `
    }).join('')
  }

  function setStatus(message, tone = '') {
    if (!statusEl) {
      return
    }

    statusEl.classList.remove('error', 'info', 'success')
    if (tone) {
      statusEl.classList.add(tone)
    }
    statusEl.textContent = message
  }

  renderTypeFields(typeSelectEl?.value || 'bug')

  typeSelectEl?.addEventListener('change', () => {
    renderTypeFields(typeSelectEl.value)
    setStatus('')
  })

  attachmentsInputEl?.addEventListener('change', () => {
    updateSelectedFilesLabel()
    setStatus('')
  })

  formEl?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const type = typeSelectEl?.value || 'bug'
    const definition = getSupportTicketType(type)
    const summary = summaryInputEl?.value || ''
    const fields = {}

    definition?.fields.forEach((field) => {
      const input = formEl.querySelector(`[name="field-${field.key}"]`)
      fields[field.key] = input?.value || ''
    })

    const honeypotInput = formEl.querySelector('input[name="website"]')
    let attachments = []

    try {
      attachments = await buildAttachmentPayloads(attachmentsInputEl)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read selected screenshots.'
      setStatus(message, 'error')
      return
    }

    const payload = {
      type,
      summary,
      fields,
      attachments,
      honeypot: honeypotInput?.value || '',
      sourcePage: window.location.href,
      userAgent: navigator.userAgent,
    }

    const validation = validateSupportTicketSubmission(payload)
    if (!validation.ok) {
      setStatus(validation.error, 'error')
      return
    }

    setStatus('Submitting ticket...', 'info')
    if (submitButtonEl) {
      submitButtonEl.disabled = true
    }

    try {
      const response = await fetch('/api/submit-issue', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const fallbackMessage = typeof result.error === 'string' ? result.error : 'Unable to submit ticket right now.'
        setStatus(`${fallbackMessage} You can still submit on GitHub.`, 'error')
        return
      }

      const issueUrl = typeof result.issueUrl === 'string' ? result.issueUrl : ''
      if (issueUrl) {
        setStatus(`Ticket submitted successfully. View it here: ${issueUrl}`, 'success')
      } else {
        setStatus('Ticket submitted successfully.', 'success')
      }

      formEl.reset()
      typeSelectEl.value = type
      renderTypeFields(type)
      updateSelectedFilesLabel()
    } catch (error) {
      setStatus('Network error while submitting. You can still submit on GitHub.', 'error')
    } finally {
      if (submitButtonEl) {
        submitButtonEl.disabled = false
      }
    }
  })

  updateSelectedFilesLabel()
}

function initializeSupportPage() {
  document.body.classList.add('docs-page', 'support-page')

  const settingsToggle = document.querySelector('#settings-toggle')
  const settingsPanel = document.querySelector('#settings-panel')
  const closeSettingsButton = document.querySelector('#close-settings')
  const themeInputs = document.querySelectorAll('input[name="theme"]')
  const fontSelect = document.querySelector('#font-select')
  const formRootEl = document.querySelector('#support-form-root')

  if (settingsToggle) {
    settingsToggle.innerHTML = SETTINGS_GEAR_ICON_MARKUP
  }

  initSettingsUi({
    settingsToggle,
    settingsPanel,
    closeSettingsButton,
    themeInputs,
    fontSelect,
    onThemeChange: (nextTheme) => {
      applyTheme(nextTheme, { themeInputs })
      mountPageAdBanner()
    },
    onFontChange: (nextFont) => applyFontPreference(nextFont, { fontSelect }),
  })

  applyTheme(getStoredTheme(), { themeInputs })
  applyFontPreference(getStoredFontPreference(), { fontSelect })
  renderSupportForm(formRootEl)
  mountPageAdBanner()
  initAnalytics({ trackInitialView: true })
}

initializeSupportPage()
