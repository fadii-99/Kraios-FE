import assert from 'node:assert/strict'
import test from 'node:test'

import { drawingPointFromClick } from '../calibration.js'

test('calibration uses the image bounds when the containing button is wider', () => {
  const event = {
    clientX: 450,
    clientY: 250,
    currentTarget: {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }),
      querySelector: () => ({
        getBoundingClientRect: () => ({ left: 250, top: 100, width: 400, height: 300 }),
      }),
    },
  }
  assert.deepEqual(drawingPointFromClick(event, 1200, 900), { x: 600, y: 450 })
})
