export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function cleanText(value) {
  const text = value === null || value === undefined ? '' : String(value).trim()
  if (!text || text === '---') {
    return ''
  }

  return text
}

export function toInventoryCount(value) {
  const count = Number(value)
  if (!Number.isFinite(count) || count < 0) {
    return 0
  }

  return count
}