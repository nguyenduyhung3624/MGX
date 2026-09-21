
const Header = () => {
  return (
    <header className="top-bar">
      <button aria-label="Open menu" className="icon-btn nav-toggle" id="navToggle">
        <svg viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="search-box">
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20 16.5 16.5" />
        </svg>
        <input placeholder="Search manga" type="text" />
        <kbd>/</kbd>
      </div>

      <div className="top-bar-actions">
        <button className="icon-btn" id="themeToggle" title="Toggle light/dark theme">
          <svg className="icon-dark" viewBox="0 0 24 24">
            <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
          </svg>
          <svg className="icon-light" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2.4M12 19.1v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7" />
          </svg>
        </button>
      </div>
    </header>
  )
}

export default Header
