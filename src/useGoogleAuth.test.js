import test from 'node:test'
import assert from 'node:assert/strict'
import { useGoogleAuth } from './useGoogleAuth.js'

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
        disabled: false,
        addEventListener() {},
        appendChild() {},
      }
      return element
    },
    head: { appendChild() {} },
  }

  try {
    const auth = useGoogleAuth({ clientId: 'client-id' })
    const container = {
      innerHTML: '',
      appendChild(element) {
        this.child = element
      },
    }

    const rendered = auth.renderSignInButton(container)

    assert.equal(rendered, true)
    assert.equal(container.child?.tagName, 'BUTTON')
    assert.equal(container.child?.textContent, 'Sign in with Google')
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
