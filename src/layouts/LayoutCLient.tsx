import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../components/layouts/Header'
import Sidebar from '../components/layouts/Sidebar'
import Footer from './Footer'

type LayoutCLientProps = {
  children: ReactNode
}

const LayoutCLient = ({ children }: LayoutCLientProps) => {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const savedTheme = localStorage.getItem('manga-theme')
    const devicePrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
    root.setAttribute('data-theme', savedTheme || (devicePrefersLight ? 'light' : 'dark'))
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const toggleTheme = () => {
    const root = document.documentElement
    const isLight = root.getAttribute('data-theme') === 'light'
    const nextTheme = isLight ? 'dark' : 'light'
    root.setAttribute('data-theme', nextTheme)
    localStorage.setItem('manga-theme', nextTheme)
  }

  return (
    <div className="app-shell">
      <Sidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="main-area">
        {location.pathname !== '/' && (
          <Header onMenuOpen={() => setMobileMenuOpen(true)} onThemeToggle={toggleTheme} />
        )}
        {location.pathname === '/' && (
          <button
            aria-label="Open menu"
            className="mobile-floating-menu"
            onClick={() => setMobileMenuOpen(true)}
            type="button"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <main className="content">{children}</main>
        <Footer />
      </div>
    </div>
  )
}

export default LayoutCLient
