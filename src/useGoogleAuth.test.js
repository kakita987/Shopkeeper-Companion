import test from 'node:test'
import assert from 'node:assert/strict'
import { useGoogleAuth } from './useGoogleAuth.js'

const VALID_CLIENT_ID = '123-example.apps.googleusercontent.com'

function createDocumentMock() {
  return {
    querySelector: () => null,
    createElement: (tagName) => {
      const element = {
        tagName: tagName.toUpperCase(),
        textContent: '',
        innerHTML: '',
        className: '',
        disabled: false,
        addEventListener() {},
        appendChild() {},
      }
      return element
    },
    head: { appendChild() {} },
  }
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

async function waitFor(predicate, attempts = 20) {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) {
      return true
    }

    await flushMicrotasks()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return false
}

test('renderSignInButton creates a plain consent button without the profile scope flow', async () => {
  const tokenClient = {
    requestAccessToken() {},
  }

  const originalWindow = globalThis.window
  const originalDocument = globalThis.document

  globalThis.window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: () => tokenClient,
        },
      },
    },
  }

  globalThis.document = {
    querySelector: () => null,
    createElement: (tagName) => {
      const element = {
        tagName: tagName.toUpperCase(),
        textContent: '',
        innerHTML: '',
        className: '',
        disabled: false,
        addEventListener() {},
        appendChild() {},
      }
      return element
    },
    head: { appendChild() {} },
  }

  try {
    const auth = useGoogleAuth({ clientId: VALID_CLIENT_ID })
    const container = {
      innerHTML: '',
      appendChild(element) {
        this.child = element
      },
    }

    const rendered = auth.renderSignInButton(container)

    assert.equal(rendered, true)
    assert.equal(container.child?.tagName, 'BUTTON')
    assert.match(container.child?.className, /google-signin-button/)
    assert.match(container.child?.innerHTML, /Sign in with Google/)
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }

    if (originalDocument === undefined) {
      delete globalThis.document
    } else {
      globalThis.document = originalDocument
    }
  }
})

test('useGoogleAuth becomes ready without requesting a token on startup', async () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document

  const prompts = []
  let oauthCallback = null
  const tokenClient = {
    requestAccessToken({ prompt }) {
      prompts.push(prompt)
    },
  }

  globalThis.window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config) => {
            oauthCallback = config.callback
            return tokenClient
          },
        },
      },
    },
  }

  globalThis.document = createDocumentMock()

  try {
    const auth = useGoogleAuth({ clientId: VALID_CLIENT_ID })
    const becameReady = await waitFor(() => auth.getState().isReady)
    assert.equal(becameReady, true)

    const state = auth.getState()
    assert.equal(state.isReady, true)
    assert.equal(state.isAuthenticated, false)
    assert.equal(state.accessToken, null)
    assert.deepEqual(prompts, [])
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }

    if (originalDocument === undefined) {
      delete globalThis.document
    } else {
      globalThis.document = originalDocument
    }
  }
})

test('useGoogleAuth rejects a malformed deployment client ID before initializing GIS', async () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  let initializeCalls = 0

  globalThis.window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: () => {
            initializeCalls += 1
            return {}
          },
        },
      },
    },
  }
  globalThis.document = createDocumentMock()

  try {
    const auth = useGoogleAuth({ clientId: `VITE_GOOGLE_CLIENT_ID=${VALID_CLIENT_ID}` })
    await flushMicrotasks()

    const state = auth.getState()
    assert.equal(state.isReady, false)
    assert.equal(state.clientIdMissing, true)
    assert.match(state.error, /must contain only a Web application client ID/)
    assert.equal(initializeCalls, 0)
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }

    if (originalDocument === undefined) {
      delete globalThis.document
    } else {
      globalThis.document = originalDocument
    }
  }
})

test('signIn requests consent after initialization', async () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document

  const prompts = []
  let oauthCallback = null
  const tokenQueue = [{ access_token: 'signed-in-token' }]

  const tokenClient = {
    requestAccessToken({ prompt }) {
      prompts.push(prompt)
      const response = tokenQueue.shift() || { error: 'login_required' }
      queueMicrotask(() => {
        oauthCallback?.(response)
      })
    },
  }

  globalThis.window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config) => {
            oauthCallback = config.callback
            return tokenClient
          },
        },
      },
    },
  }

  globalThis.document = createDocumentMock()

  try {
    const auth = useGoogleAuth({ clientId: VALID_CLIENT_ID })
    const becameReady = await waitFor(() => auth.getState().isReady)
    assert.equal(becameReady, true)

    const accessToken = await auth.signIn()
    const state = auth.getState()
    assert.equal(state.isReady, true)
    assert.equal(state.isAuthenticated, true)
    assert.equal(state.accessToken, 'signed-in-token')
    assert.equal(state.error, null)
    assert.equal(accessToken, 'signed-in-token')
    assert.deepEqual(prompts, ['consent'])
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }

    if (originalDocument === undefined) {
      delete globalThis.document
    } else {
      globalThis.document = originalDocument
    }
  }
})

test('refreshAccessToken requests consent in interactive mode', async () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document

  const prompts = []
  let oauthCallback = null
  const tokenQueue = [
    { access_token: 'interactive-token' },
  ]

  const tokenClient = {
    requestAccessToken({ prompt }) {
      prompts.push(prompt)
      const response = tokenQueue.shift() || { error: 'login_required' }
      queueMicrotask(() => {
        oauthCallback?.(response)
      })
    },
  }

  globalThis.window = {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config) => {
            oauthCallback = config.callback
            return tokenClient
          },
        },
      },
    },
  }

  globalThis.document = createDocumentMock()

  try {
    const auth = useGoogleAuth({ clientId: VALID_CLIENT_ID })
    const becameReady = await waitFor(() => auth.getState().isReady)
    assert.equal(becameReady, true)

    const interactiveToken = await auth.refreshAccessToken({ interactive: true })
    assert.equal(interactiveToken, 'interactive-token')
    assert.deepEqual(prompts, ['consent'])
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }

    if (originalDocument === undefined) {
      delete globalThis.document
    } else {
      globalThis.document = originalDocument
    }
  }
})
