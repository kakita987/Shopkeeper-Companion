const VITE_ASSET_MODULES = import.meta.env?.DEV || import.meta.env?.PROD
  ? import.meta.glob('./assets/**/*.{png,jpg,jpeg,gif,webp,svg}', { eager: true, import: 'default', query: '?url' })
  : {}

export function normalizeAssetPath(relativePath) {
  const rawPath = String(relativePath || '').trim().replace(/\\/g, '/')
  if (!rawPath) {
    return ''
  }

  if (rawPath.startsWith('./')) {
    return rawPath
  }

  if (rawPath.startsWith('/src/')) {
    return `.${rawPath.slice(4)}`
  }

  if (rawPath.startsWith('/')) {
    return `.${rawPath}`
  }

  return `./${rawPath}`
}

export const VITE_ASSET_URLS = new Map(
  Object.entries(VITE_ASSET_MODULES)
    .map(([modulePath, url]) => [normalizeAssetPath(modulePath), url])
    .filter(([relativePath, url]) => relativePath && typeof url === 'string' && url),
)

const TEST_ASSET_PATHS = Array.isArray(globalThis.__SHOPKEEPER_TEST_ASSET_PATHS__)
  ? globalThis.__SHOPKEEPER_TEST_ASSET_PATHS__.map(normalizeAssetPath).filter(Boolean)
  : []

export const BLUEPRINT_ASSET_PATHS = VITE_ASSET_URLS.size
  ? [...VITE_ASSET_URLS.keys()]
  : TEST_ASSET_PATHS