const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client'
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const GOOGLE_AUTH_SCOPES = `${SHEETS_SCOPE} ${DRIVE_FILE_SCOPE}`
const MISSING_CLIENT_ID_MESSAGE = 'Google sign-in is not configured for this deployment. Set VITE_GOOGLE_CLIENT_ID in your production environment.'

let gisScriptPromise = null

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve()
  }

  if (gisScriptPromise) {
    return gisScriptPromise
  }

  gisScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Google Identity Services failed to load.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_IDENTITY_SCRIPT
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Identity Services failed to load.'))
    document.head.appendChild(script)
  })

  return gisScriptPromise
}

export function useGoogleAuth({ clientId }) {
  const listeners = new Set()
  let tokenClient = null
  let pendingSignIn = null
  let idApiReady = false
  let initializePromise = null

  const state = {
    accessToken: null,
    isLoading: true,
    isReady: false,
    isAuthenticating: false,
    isAuthenticated: false,
    clientIdMissing: !clientId,
    error: null,
  }

  function notify() {
    listeners.forEach((listener) => listener({ ...state }))
  }

  function updateState(patch) {
    Object.assign(state, patch)
    notify()
  }

  async function initialize() {
    if (initializePromise) {
      return initializePromise
    }

    initializePromise = (async () => {
      if (!clientId) {
        updateState({
          isLoading: false,
          isReady: false,
          error: MISSING_CLIENT_ID_MESSAGE,
        })
        return
      }

      try {
        updateState({ isLoading: true, error: null })
        await loadGoogleIdentityScript()

        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: GOOGLE_AUTH_SCOPES,
          callback: (response) => {
            state.isAuthenticating = false

            if (!response || response.error) {
              updateState({
                isAuthenticated: false,
                accessToken: null,
                error: response?.error || 'Google sign-in failed.',
              })
              pendingSignIn?.reject(new Error(response?.error || 'Google sign-in failed.'))
              pendingSignIn = null
              return
            }

            updateState({
              isAuthenticated: true,
              accessToken: response.access_token,
              error: null,
            })
            pendingSignIn?.resolve(response.access_token)
            pendingSignIn = null
          },
        })

        updateState({
          isLoading: false,
          isReady: true,
          error: null,
        })
      } catch (error) {
        updateState({
          isLoading: false,
          isReady: false,
          error: error?.message || 'Unable to initialize Google Identity Services.',
        })
      }
    })()

    await initializePromise
    initializePromise = null
  }

  async function signIn() {
    if (state.clientIdMissing || state.isAuthenticating) {
      if (state.clientIdMissing) {
        updateState({ error: MISSING_CLIENT_ID_MESSAGE })
      }
      return null
    }

    if (!tokenClient) {
      await initialize()
    }

    if (!tokenClient) {
      return null
    }

    updateState({ isAuthenticating: true, error: null })

    return new Promise((resolve, reject) => {
      pendingSignIn = { resolve, reject }
      const prompt = state.accessToken ? '' : 'consent'
      tokenClient.requestAccessToken({ prompt })
    })
  }

  async function signOut() {
    const token = state.accessToken
    if (!token) {
      updateState({ isAuthenticated: false, accessToken: null, error: null })
      return
    }

    if (window.google?.accounts?.oauth2?.revoke) {
      await new Promise((resolve) => {
        window.google.accounts.oauth2.revoke(token, () => resolve())
      })
    }

    updateState({
      isAuthenticated: false,
      accessToken: null,
      error: null,
    })
  }

  function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function renderSignInButton(container) {
    if (!container) {
      return false
    }

    container.innerHTML = ''
    return false
  }

  initialize()

  return {
    getState: () => ({ ...state }),
    subscribe,
    renderSignInButton,
    signIn,
    signOut,
  }
}
