function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeUrl(url) {
  const value = String(url || '').trim()
  if (!value) {
    return ''
  }

  if (/^(https?:|mailto:|\/|#)/i.test(value)) {
    return value
  }

  return ''
}

function renderInlineMarkdown(text) {
  const source = String(text || '')
  const tokenPattern = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\))/g
  let html = ''
  let cursor = 0
  let match

  while ((match = tokenPattern.exec(source)) !== null) {
    html += escapeHtml(source.slice(cursor, match.index))

    if (match[2] !== undefined) {
      html += `<strong>${escapeHtml(match[2])}</strong>`
    } else {
      const label = match[3] || ''
      const url = sanitizeUrl(match[4])
      if (!url) {
        html += escapeHtml(match[0])
      } else {
        const isExternal = /^https?:/i.test(url)
        const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
        html += `<a class="inline-link" href="${escapeHtml(url)}"${attrs}>${escapeHtml(label)}</a>`
      }
    }

    cursor = tokenPattern.lastIndex
  }

  html += escapeHtml(source.slice(cursor))
  return html
}

export function renderMarkdown(markdown) {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n')
  const html = []

  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1].length + 1)
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`)
      index += 1
      continue
    }

    if (/^-\s+/.test(trimmed)) {
      const items = []
      while (index < lines.length && /^-\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^-\s+/, ''))
        index += 1
      }

      const listItems = items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')
      html.push(`<ul>${listItems}</ul>`)
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''))
        index += 1
      }

      const listItems = items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')
      html.push(`<ol>${listItems}</ol>`)
      continue
    }

    const paragraphLines = []
    while (index < lines.length) {
      const current = lines[index].trim()
      if (!current || /^(#{1,6})\s+/.test(current) || /^-\s+/.test(current) || /^\d+\.\s+/.test(current)) {
        break
      }

      paragraphLines.push(current)
      index += 1
    }

    html.push(`<p>${renderInlineMarkdown(paragraphLines.join(' '))}</p>`)
  }

  return html.join('\n')
}
