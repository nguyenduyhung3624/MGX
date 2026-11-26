import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../components/layouts/Header'
import Sidebar from '../components/layouts/Sidebar'
import Footer from './Footer'
import { getTheme, setTheme, toggleTheme } from '../services/theme'

type LayoutCLientProps = {
  children: ReactNode
}

const LayoutCLient = ({ children }: LayoutCLientProps) => {
  const location = useLocation()
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setTheme(getTheme())
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const openMobileMenu = () => setMobileMenuOpen(true)
    window.addEventListener('open-mobile-menu', openMobileMenu)
    return () => window.removeEventListener('open-mobile-menu', openMobileMenu)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <div className={`app-shell${isAuthRoute ? ' auth-route' : ''}`}>
      <Sidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className={`main-area${isAuthRoute ? ' auth-main-area' : ''}`}>
        {location.pathname !== '/' && (
          <Header onMenuOpen={() => setMobileMenuOpen(true)} onThemeToggle={toggleTheme} showSearch={!isAuthRoute} />
        )}

        <main className={`content${isAuthRoute ? ' auth-content' : ''}`}>{children}</main>
        {!isAuthRoute && <Footer />}
      </div>
    </div>
  )
}

export default LayoutCLient
