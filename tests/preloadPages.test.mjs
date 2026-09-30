import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preloadPages } from '../src/services/preloadPages.ts'

function fixture() {
  const images = []
  const create = () => {
    const image = { complete: false, removeAttribute() { this.src = '' } }
    images.push(image)
    return image
  }
  return { images, create }
}

test('loads every page with four in flight and continues after an image error', () => {
  const { images, create } = fixture()
  const session = preloadPages(Array.from({ length: 12 }, (_, i) => `page-${i}`), create)
  assert.equal(images.length, 4)
  images[0].onerror()
  assert.equal(images.length, 5)
  for (let i = 1; i < 12; i++) {
    images[i].complete = true
    images[i].onload()
    assert(images.filter(image => image.onload).length <= 4)
  }
  assert.equal(new Set(images.map(image => image.src)).size, 12)
  session.dispose()
})

test('prioritizes the new reading position without restarting existing requests', () => {
  const { images, create } = fixture()
  const session = preloadPages(Array.from({ length: 12 }, (_, i) => `page-${i}`), create)
  session.prioritize(8)
  images[0].onload()
  assert.equal(images[4].src, 'page-8')
  session.dispose()
})

test('disposal cancels pending images and prevents a new batch', () => {
  const { images, create } = fixture()
  const session = preloadPages(Array.from({ length: 12 }, (_, i) => `page-${i}`), create)
  session.dispose()
  assert.equal(images.length, 4)
  assert(images.every(image => image.onload === null && image.src === ''))
  session.prioritize(9)
  assert.equal(images.length, 4)
})
