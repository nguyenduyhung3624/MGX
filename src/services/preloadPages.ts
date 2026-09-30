// Keep loaded images alive for the current chapter and bound background traffic.
export function preloadPages(urls: string[], createImage = () => new Image()) {
  const images = new Map<number, HTMLImageElement>()
  let pending = urls.map((_, index) => index)
  let running = 0
  let disposed = false

  const pump = () => {
    while (!disposed && running < 4 && pending.length) {
      const index = pending.shift()!
      const image = createImage()
      images.set(index, image)
      running++
      image.decoding = 'async'
      image.fetchPriority = index < 3 ? 'high' : 'low'
      const done = () => {
        image.onload = null
        image.onerror = null
        running--
        if (!disposed) pump()
      }
      image.onload = done
      image.onerror = done
      image.src = urls[index]
    }
  }
  pump()
  return {
    prioritize(index: number) {
      // Next pages first, then earlier pages, without restarting in-flight loads.
      pending.sort((a, b) => {
        const rank = (page: number) => page >= index ? page - index : urls.length + index - page
        return rank(a) - rank(b)
      })
      for (let page = index; page <= index + 2; page++) {
        const image = images.get(page)
        if (image) image.fetchPriority = 'high'
      }
      pump()
    },
    dispose() {
      disposed = true
      pending = []
      images.forEach(image => {
        image.onload = null
        image.onerror = null
        if (!image.complete) image.removeAttribute('src')
      })
      images.clear()
    },
  }
}
