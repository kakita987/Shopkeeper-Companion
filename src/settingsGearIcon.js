import { Cog } from 'lucide'

function toAttrString(attrs) {
  return Object.entries(attrs)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(' ')
}

function renderLucideIconNode(iconNode) {
  return iconNode
    .map(([tagName, attrs]) => `<${tagName} ${toAttrString(attrs)} />`)
    .join('')
}

export const SETTINGS_GEAR_ICON_MARKUP = `<svg class="settings-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" role="img">${renderLucideIconNode(Cog)}</svg>`