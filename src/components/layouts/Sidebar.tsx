import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useLocalLibrary } from '../../hooks/useLocalLibrary'
import { useAuth } from '../../hooks/useAuth'

type SidebarProps = { open?: boolean; onClose?: () => void }

const Sidebar = ({ open = false, onClose }: SidebarProps) => {
  const library = useLocalLibrary()
  const { user, logout } = useAuth()
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('mgx-theme', theme)
  }, [theme])

  useEffect(() => {
    const saved = localStorage.getItem('mgx-theme')
    if (saved === 'light' || saved === 'dark') setTheme(saved)
  }, [])

  return (
    <>
      <aside className={'side-nav' + (open ? ' open' : '')} id="sideNav">
        <div className="side-brand">
          <a className="side-logo" href="/">
            <span>MGX</span>
          </a>
          <div className="theme-switch" aria-label="Color theme">
            {theme === 'dark' ? (
              <button aria-label="Use light theme" onClick={() => setTheme('light')} type="button">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="3.5" />
                  <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
                </svg>
              </button>
            ) : (
              <button aria-label="Use dark theme" onClick={() => setTheme('dark')} type="button">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 15.2A8.2 8.2 0 0 1 8.8 4a8.4 8.4 0 1 0 11.2 11.2Z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <nav className="nav-group">
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/" end>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 11.5 12 4l8 7.5" />
              <path d="M6 10v9h5v-5h2v5h5v-9" />
            </svg>
            Home
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/library">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3.5h12v17l-6-3.5-6 3.5z" />
            </svg>
            Saved manga <span className="saved-count">{library.saved.length}</span>
          </NavLink>
          <a className="nav-link" href="#">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
              <path d="M3.5 5v5h5" />
              <path d="M12 8v4.5l3.5 2" />
            </svg>
            Reading history
          </a>
        </nav>

        <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/search">Search manga</NavLink>
        <div className="nav-heading">EXPLORE</div>
        <nav className="nav-group">
          <a className="nav-link" href="#updates">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M4 12h11M4 18h7" />
            </svg>
            Recently updated
          </a>
          <a className="nav-link" href="#">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16.5 3.5 20 7l-3.5 3.5M20 7H10a5 5 0 0 0 0 10h1" />
              <path d="M7.5 20.5 4 17l3.5-3.5" />
            </svg>
            Random
          </a>
        </nav>

        <div className="side-auth">
          {user ? (
            <>
              <div className="side-auth-user">
                <strong>{user.displayName}</strong>
                <span>{user.email}</span>
              </div>
              <button className="side-auth-signout" onClick={() => void logout()} type="button">
                Sign out
              </button>
            </>
          ) : (
            <div className="side-auth-actions">
              <NavLink className="side-auth-link" to="/login">Sign in</NavLink>
              <NavLink className="side-auth-link is-primary" to="/register">Create account</NavLink>
            </div>
          )}
        </div>
      </aside>

      <button aria-label="Close menu" className={'side-nav-backdrop' + (open ? ' open' : '')} onClick={onClose} type="button" />
    </>
  )
}

export default Sidebar
