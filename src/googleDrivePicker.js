const GOOGLE_API_SCRIPT = 'https://apis.google.com/js/api.js'

let googleApiScriptPromise = null
let pickerLibraryPromise = null

function loadGoogleApiScript() {
  if (window.gapi?.load && window.google?.picker) {
    return Promise.resolve()
  }

  if (googleApiScriptPromise) {
    return googleApiScriptPromise
  }

  googleApiScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${GOOGLE_API_SCRIPT}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Google API client failed to load.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_API_SCRIPT
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google API client failed to load.'))
    document.head.appendChild(script)
  })

  return googleApiScriptPromise
}

async function ensurePickerLibrary() {
  if (window.google?.picker && window.gapi?.load) {
    return
  }

  await loadGoogleApiScript()

  if (!window.gapi?.load) {
    throw new Error('Google API loader is unavailable.')
  }

  if (pickerLibraryPromise) {
    return pickerLibraryPromise
  }

  pickerLibraryPromise = new Promise((resolve, reject) => {
    window.gapi.load('picker', {
      callback: () => {
        if (window.google?.picker) {
          resolve()
          return
        }
        reject(new Error('Google Picker is unavailable.'))
      },
      onerror: () => reject(new Error('Google Picker failed to load.')),
      timeout: 10000,
      ontimeout: () => reject(new Error('Google Picker loading timed out.')),
    })
  })

  return pickerLibraryPromise
}

function openPicker(accessToken, developerKey, viewBuilder) {
  if (!accessToken) {
    return Promise.reject(new Error('Google access token is required to open Drive Picker.'))
  }

  if (!developerKey) {
    return Promise.reject(new Error('Google Picker requires a Developer Key. Set VITE_GOOGLE_API_KEY.'))
  }

  return new Promise((resolve, reject) => {
    const picker = new window.google.picker.PickerBuilder()
      .addView(viewBuilder)
      .setOAuthToken(accessToken)
      .setDeveloperKey(developerKey)
      .setOrigin(window.location.origin)
      .setCallback((data) => {
        const action = data?.[window.google.picker.Response.ACTION]
        if (action === window.google.picker.Action.CANCEL) {
          resolve(null)
          return
        }

        if (action !== window.google.picker.Action.PICKED) {
          return
        }

        const doc = data?.[window.google.picker.Response.DOCUMENTS]?.[0]
        if (!doc) {
          reject(new Error('Google Picker did not return a file selection.'))
          return
        }

        resolve({
          id: String(doc[window.google.picker.Document.ID] || '').trim(),
          name: String(doc[window.google.picker.Document.NAME] || '').trim(),
          url: String(doc[window.google.picker.Document.URL] || '').trim(),
        })
      })
      .build()

    picker.setVisible(true)
  })
}

export async function pickSpreadsheetFromDrive({ accessToken, developerKey }) {
  await ensurePickerLibrary()

  const view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS)
    .setSelectFolderEnabled(false)
    .setIncludeFolders(false)

  return openPicker(accessToken, developerKey, view)
}

export async function pickFolderFromDrive({ accessToken, developerKey }) {
  await ensurePickerLibrary()

  const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true)

  return openPicker(accessToken, developerKey, view)
}
