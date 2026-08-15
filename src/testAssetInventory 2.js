import { readdirSync } from 'node:fs'

const ASSET_DIRECTORY_URL = new URL('./assets/', import.meta.url)
const SUPPORTED_IMAGE_EXTENSION = /\.(?:png|jpe?g|gif|webp|svg)$/i

function readAssetPaths(directoryUrl, relativeDirectory = '') {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDirectory}${entry.name}`
    if (entry.isDirectory()) {
      return readAssetPaths(new URL(`${entry.name}/`, directoryUrl), `${relativePath}/`)
    }

    return SUPPORTED_IMAGE_EXTENSION.test(entry.name)
      ? [`./assets/${relativePath}`]
      : []
  })
}

globalThis.__SHOPKEEPER_TEST_ASSET_PATHS__ = readAssetPaths(ASSET_DIRECTORY_URL)