import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

// Single search box (lives in the header). On /search it mirrors the ?q= param.
export default function SearchForm() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const urlQuery = pathname === '/search' ? (params.get('q') ?? '') : ''
  const [value, setValue] = useState(urlQuery)

  useEffect(() => {
    setValue(urlQuery)
  }, [urlQuery])

  return <form className="manga-search-form" role="search" onSubmit={(event) => {
    event.preventDefault()
    if (value.trim()) navigate(`/search?q=${encodeURIComponent(value.trim())}`)
  }}>
    <input aria-label="Search manga" type="search" placeholder="Search manga titles…" maxLength={200} value={value} onChange={(event) => setValue(event.target.value)} />
    <button type="submit" disabled={!value.trim()}>Search</button>
  </form>
}
