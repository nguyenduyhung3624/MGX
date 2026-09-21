const Sidebar = () => {
  return (
    <>
      <aside className="side-nav" id="sideNav">
        <a className="side-logo" href="#">
          <span className="dot" />
          MANGA
        </a>

        <nav className="nav-group">
          <a className="nav-link active" href="#">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 11.5 12 4l8 7.5" />
              <path d="M6 10v9h5v-5h2v5h5v-9" />
            </svg>
            Home
          </a>
          <a className="nav-link" href="#">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3.5h12v17l-6-3.5-6 3.5z" />
            </svg>
            Following
          </a>
          <a className="nav-link" href="#">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect height="16" rx="1" width="7" x="3.5" y="4" />
              <rect height="16" rx="1" width="7" x="13.5" y="4" />
            </svg>
            Library
          </a>
          <a className="nav-link" href="#">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
              <path d="M3.5 5v5h5" />
              <path d="M12 8v4.5l3.5 2" />
            </svg>
            Reading history
          </a>
        </nav>

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
      </aside>

      <div className="side-nav-backdrop" id="sideNavBackdrop" />
    </>
  )
}

export default Sidebar
