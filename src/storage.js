const DB_NAME = 'ShopkeeperCompanion'
const STORE_NAME = 'cache'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error('Failed to open IndexedDB'))
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

export async function setItem(key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(value, key)

    request.onerror = () => reject(new Error(`Failed to save ${key} to IndexedDB`))
    request.onsuccess = () => resolve()
  })
}

export async function getItem(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(key)

    request.onerror = () => reject(new Error(`Failed to read ${key} from IndexedDB`))
    request.onsuccess = () => resolve(request.result)
  })
}

export async function removeItem(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(key)

    request.onerror = () => reject(new Error(`Failed to delete ${key} from IndexedDB`))
    request.onsuccess = () => resolve()
  })
}
