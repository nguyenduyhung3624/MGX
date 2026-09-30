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

test('preloads only the current page and two pages ahead', () => {
  const { images, create } = fixture()
  const session = preloadPages(Array.from({ length: 12 }, (_, i) => `page-${i}`), create)
  assert.equal(images.length, 3)
  assert.deepEqual(images.map(image => image.src), ['page-0', 'page-1', 'page-2'])
  assert.equal(images[0].fetchPriority, 'high')
  assert.equal(images[1].fetchPriority, 'high')
  assert.equal(images[2].fetchPriority, 'low')
  session.dispose()
})

test('moves the preload window with the reading position', () => {
  const { images, create } = fixture()
  const session = preloadPages(Array.from({ length: 12 }, (_, i) => `page-${i}`), create)
  session.prioritize(8)
  assert.deepEqual(images.slice(3).map(image => image.src), ['page-8', 'page-9', 'page-10'])
  assert(images.length <= 6)
  session.dispose()
})

test('disposal cancels in-flight images and prevents new loads', () => {
  const { images, create } = fixture()
  const session = preloadPages(Array.from({ length: 12 }, (_, i) => `page-${i}`), create)
  session.dispose()
  assert.equal(images.length, 3)
  assert(images.every(image => image.src === ''))
  session.prioritize(9)
  assert.equal(images.length, 3)
})
