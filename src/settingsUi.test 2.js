import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applySizePreference,
  getStoredSizePreference,
  initSettingsUi,
} from './settingsUi.js'

function installPreferenceGlobals(storedValues = {}) {
  const values = new Map(Object.entries(storedValues))
  const originalDocument = globalThis.document
  const originalLocalStorage = globalThis.localStorage

  globalThis.document = {
    documentElement: {
      dataset: {},
    },
  }
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }

  return {
    values,
    restore() {
      globalThis.document = originalDocument
      globalThis.localStorage = originalLocalStorage
    },
  }
}

function createInput(value) {
  const listeners = new Map()
  const attributes = new Map()
  const parentStyles = new Map()

  return {
    value,
    checked: false,
    parentElement: {
      style: {
        setProperty(name, styleValue) {
          parentStyles.set(name, styleValue)
        },
        getPropertyValue(name) {
          return parentStyles.get(name) ?? ''
        },
      },
    },
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
    dispatch(type, event = {}) {
      listeners.get(type)?.({
        currentTarget: this,
        preventDefault() {},
        ...event,
      })
    },
    setAttribute(name, attributeValue) {
      attributes.set(name, attributeValue)
    },
    getAttribute(name) {
      return attributes.get(name) ?? null
    },
  }
}

test('applySizePreference applies and persists a valid size', () => {
  const globals = installPreferenceGlobals()
  const sizeSlider = createInput('1')

  try {
    applySizePreference('large', { sizeSlider })

    assert.equal(document.documentElement.dataset.sizePreference, 'large')
    assert.equal(sizeSlider.value, '2')
    assert.equal(sizeSlider.parentElement.style.getPropertyValue('--size-progress'), '100%')
    assert.equal(sizeSlider.getAttribute('aria-valuetext'), 'Large')
    assert.equal(globals.values.get('shopkeeper-size-preference'), 'large')
  } finally {
    globals.restore()
  }
})

test('applySizePreference recovers invalid values to medium', () => {
  const globals = installPreferenceGlobals()
  const sizeSlider = createInput('0')

  try {
    applySizePreference('oversized', { sizeSlider })

    assert.equal(document.documentElement.dataset.sizePreference, 'medium')
    assert.equal(sizeSlider.value, '1')
    assert.equal(sizeSlider.parentElement.style.getPropertyValue('--size-progress'), '50%')
    assert.equal(sizeSlider.getAttribute('aria-valuetext'), 'Medium')
    assert.equal(globals.values.get('shopkeeper-size-preference'), 'medium')
  } finally {
    globals.restore()
  }
})

test('getStoredSizePreference defaults stale or missing values to medium', () => {
  const globals = installPreferenceGlobals({
    'shopkeeper-size-preference': 'oversized',
  })

  try {
    assert.equal(getStoredSizePreference(), 'medium')
    globals.values.set('shopkeeper-size-preference', 'small')
    assert.equal(getStoredSizePreference(), 'small')
    globals.values.delete('shopkeeper-size-preference')
    assert.equal(getStoredSizePreference(), 'medium')
  } finally {
    globals.restore()
  }
})

test('size slider commits each selected stop immediately', () => {
  const sizeSlider = createInput('0')
  const globals = installPreferenceGlobals()
  const selectedSizes = []

  try {
    applySizePreference('small', { sizeSlider })
    initSettingsUi({
      sizeSlider,
      onSizeChange: (size) => {
        selectedSizes.push(size)
        applySizePreference(size, { sizeSlider })
      },
    })

    sizeSlider.value = '1'
    sizeSlider.dispatch('input')
    assert.deepEqual(selectedSizes, ['medium'])
    assert.equal(sizeSlider.value, '1')
    assert.equal(sizeSlider.parentElement.style.getPropertyValue('--size-progress'), '50%')
    assert.equal(document.documentElement.dataset.sizePreference, 'medium')

    sizeSlider.value = '2'
    sizeSlider.dispatch('input')
    assert.deepEqual(selectedSizes, ['medium', 'large'])
    assert.equal(sizeSlider.parentElement.style.getPropertyValue('--size-progress'), '100%')
    assert.equal(sizeSlider.getAttribute('aria-valuetext'), 'Large')
    assert.equal(globals.values.get('shopkeeper-size-preference'), 'large')
  } finally {
    globals.restore()
  }
})

test('size slider normalizes an intermediate value to the nearest stop', () => {
  const sizeSlider = createInput('1')
  const globals = installPreferenceGlobals()

  try {
    applySizePreference('medium', { sizeSlider })
    initSettingsUi({
      sizeSlider,
      onSizeChange: (size) => applySizePreference(size, { sizeSlider }),
    })

    sizeSlider.value = '1.8'
    sizeSlider.dispatch('input')
    assert.equal(document.documentElement.dataset.sizePreference, 'large')
    assert.equal(sizeSlider.value, '2')
    assert.equal(sizeSlider.parentElement.style.getPropertyValue('--size-progress'), '100%')
  } finally {
    globals.restore()
  }
})

test('size slider ignores input on the already committed stop', () => {
  const sizeSlider = createInput('1')
  const globals = installPreferenceGlobals()
  const selectedSizes = []

  try {
    applySizePreference('medium', { sizeSlider })
    initSettingsUi({
      sizeSlider,
      onSizeChange: (size) => selectedSizes.push(size),
    })
    sizeSlider.dispatch('input')
    assert.deepEqual(selectedSizes, [])
    assert.equal(sizeSlider.value, '1')
    assert.equal(sizeSlider.parentElement.style.getPropertyValue('--size-progress'), '50%')
  } finally {
    globals.restore()
  }
})

test('size slider keyboard controls select discrete sizes', () => {
  const sizeSlider = createInput('1')
  const globals = installPreferenceGlobals()
  let prevented = false

  try {
    applySizePreference('medium', { sizeSlider })
    initSettingsUi({
      sizeSlider,
      onSizeChange: (size) => applySizePreference(size, { sizeSlider }),
    })
    sizeSlider.dispatch('keydown', {
      key: 'ArrowRight',
      preventDefault() {
        prevented = true
      },
    })

    assert.equal(prevented, true)
    assert.equal(document.documentElement.dataset.sizePreference, 'large')
    assert.equal(sizeSlider.value, '2')
    assert.equal(sizeSlider.parentElement.style.getPropertyValue('--size-progress'), '100%')
  } finally {
    globals.restore()
  }
})
