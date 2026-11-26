export type AppTheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'mgx-theme'
const LEGACY_THEME_STORAGE_KEY = 'manga-theme'

export const getTheme = (): AppTheme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Fall back to the operating-system preference when storage is unavailable.
  }

  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export const setTheme = (theme: AppTheme): void => {
  document.documentElement.setAttribute('data-theme', theme)

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, theme)
  } catch {
    // The current page still receives the selected theme when storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent<AppTheme>('mgx-theme-change', { detail: theme }))
}

export const toggleTheme = (): AppTheme => {
  const current = document.documentElement.getAttribute('data-theme')
  const next: AppTheme = current === 'light' ? 'dark' : 'light'
  setTheme(next)
  return next
}
