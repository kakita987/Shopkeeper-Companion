import test from 'node:test'
import assert from 'node:assert/strict'
import { useGoogleAuth } from './useGoogleAuth.js'

test('renderSignInButton uses Google Identity Services button rendering API', async () => {
  const renderButtonCalls = []
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
        id: {
          renderButton: (container, options) => {
            renderButtonCalls.push({ container, options })
            return true
          },
        },
      },
    },
  }

  globalThis.document = {
    querySelector: () => null,
    createElement: () => ({ addEventListener() {}, setAttribute() {} }),
    head: { appendChild() {} },
  }

  try {
    const auth = useGoogleAuth({ clientId: 'client-id' })
    const container = { innerHTML: '' }

    const rendered = auth.renderSignInButton(container)

    assert.equal(rendered, true)
    assert.equal(renderButtonCalls.length, 1)
    assert.equal(renderButtonCalls[0].container, container)
    assert.deepEqual(renderButtonCalls[0].options, { theme: 'outline', size: 'large' })
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
