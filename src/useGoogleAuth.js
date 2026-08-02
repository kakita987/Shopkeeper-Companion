const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client'
const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const GOOGLE_AUTH_SCOPES = DRIVE_FILE_SCOPE
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

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'google-signin-button auth-button'
    button.innerHTML = `
      <span class="google-signin-button__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path fill="#4285F4" d="M21.6 12.23c0-.79-.07-1.54-.2-2.27H12v4.3h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.55Z"></path>
          <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.24-2.5c-.9.6-2.05.96-3.37.96-2.59 0-4.79-1.75-5.58-4.1H3.07v2.58A10 10 0 0 0 12 22Z"></path>
          <path fill="#FBBC05" d="M6.42 13.93A6.02 6.02 0 0 1 6.42 10.07V7.49H3.07a10 10 0 0 0 0 12.88l3.35-2.44Z"></path>
          <path fill="#EA4335" d="M12 6.04c1.46 0 2.78.5 3.82 1.48l2.86-2.86A9.95 9.95 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.35 2.44C7.21 7.79 9.41 6.04 12 6.04Z"></path>
        </svg>
      </span>
      <span class="google-signin-button__text">Sign in with Google</span>
    `
    button.disabled = state.isAuthenticating || state.clientIdMissing

    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      void signIn()
    })

    container.appendChild(button)
    return true
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
