export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function cleanText(value) {
  if (value === null || value === undefined) {
    return ''
  }

  const text = String(value).trim()
  if (!text || text === '---') {
    return ''
  }

  return text
}