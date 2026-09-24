import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { importLibrary, libraryKey, parseLibrary, readLibrary, rememberChapter, toggleSaved } from '../src/services/localLibrary.ts'

const mangaId = '11111111-1111-4111-8111-111111111111'
const chapterId = '22222222-2222-4222-8222-222222222222'
const otherId = '33333333-3333-4333-8333-333333333333'
const manga = { id: mangaId, title: 'Truyện thử', cover: null, status: 'ongoing', savedAt: 1 }
let data
beforeEach(() => {
  data = new Map()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } })
  globalThis.window = new EventTarget()
})

test('save and remove preserve reading progress', () => {
  toggleSaved(manga)
  rememberChapter(mangaId, chapterId, '1')
  assert.equal(readLibrary().saved.length, 1)
  toggleSaved(manga)
  assert.equal(readLibrary().saved.length, 0)
  assert.equal(readLibrary().progress[0].chapterId, chapterId)
})

test('backup round trip merges, deduplicates and preserves newer local progress', () => {
  toggleSaved(manga)
  rememberChapter(mangaId, chapterId, '5')
  const backup = JSON.stringify({ version: 1, saved: [manga, { ...manga, id: otherId }], progress: [{ mangaId, chapterId: otherId, chapter: '1', readAt: 1 }] })
  assert.equal(importLibrary(backup), 1)
  assert.equal(importLibrary(backup), 0)
  assert.equal(readLibrary().saved.length, 2)
  assert.equal(readLibrary().progress[0].chapter, '5')
  assert.deepEqual(parseLibrary(JSON.stringify(readLibrary())), readLibrary())
})

test('newer imported reading position replaces older position', () => {
  rememberChapter(mangaId, chapterId, '1')
  importLibrary(JSON.stringify({ version: 1, saved: [], progress: [{ mangaId, chapterId: otherId, chapter: '2', readAt: Date.now() + 1000 }] }))
  assert.equal(readLibrary().progress[0].chapterId, otherId)
})

test('invalid backup is atomic and cannot inject navigation paths', () => {
  toggleSaved(manga)
  const before = data.get(libraryKey)
  for (const raw of ['{', JSON.stringify({ version: 2, saved: [], progress: [] }), JSON.stringify({ version: 1, saved: [{ ...manga, id: '../redirect' }], progress: [] }), JSON.stringify({ version: 1, saved: [manga, manga], progress: [] })]) {
    assert.throws(() => importLibrary(raw))
    assert.equal(data.get(libraryKey), before)
  }
})

test('quota failure leaves existing library unchanged', () => {
  toggleSaved(manga)
  const before = data.get(libraryKey)
  localStorage.setItem = () => { throw new Error('QuotaExceededError') }
  assert.throws(() => toggleSaved(manga), /Không thể lưu/)
  assert.equal(data.get(libraryKey), before)
})

test('corrupt stored data is not silently overwritten', () => {
  data.set(libraryKey, '{broken')
  assert.throws(() => toggleSaved(manga))
  assert.equal(data.get(libraryKey), '{broken')
})
