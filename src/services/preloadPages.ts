// Preload only a small sliding window around the current page.
// This keeps click mode responsive without downloading the whole chapter in the background.
export function preloadPages(urls: string[], createImage = () => new Image()) {
  const images = new Map<number, HTMLImageElement>()
  let disposed = false
  let currentIndex = 0

  const load = (index: number, priority: 'high' | 'low' = 'low') => {
    if (disposed || index < 0 || index >= urls.length || images.has(index)) return
    const image = createImage()
    images.set(index, image)
    image.decoding = 'async'
    image.fetchPriority = priority
    image.src = urls[index]
  }

  const fillWindow = (index: number) => {
    // Current page is already rendered by React, but preloading it also warms
    // the browser cache before/while the visible <img> is mounted.
    load(index, 'high')
    load(index + 1, 'high')
    load(index + 2, 'low')

    // Drop completed pages that are far away so the preloader itself stays small.
    for (const [page, image] of images) {
      if (page < index - 1 || page > index + 2) {
        image.onload = null
        image.onerror = null
        if (!image.complete) image.removeAttribute('src')
        images.delete(page)
      }
    }
  }

  fillWindow(currentIndex)

  return {
    prioritize(index: number) {
      if (disposed) return
      currentIndex = Math.max(0, Math.min(index, Math.max(0, urls.length - 1)))
      fillWindow(currentIndex)
      const current = images.get(currentIndex)
      const next = images.get(currentIndex + 1)
      if (current) current.fetchPriority = 'high'
      if (next) next.fetchPriority = 'high'
    },
    dispose() {
      disposed = true
      images.forEach(image => {
        image.onload = null
        image.onerror = null
        if (!image.complete) image.removeAttribute('src')
      })
      images.clear()
    },
  }
}
