import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SearchForm({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue)
  const navigate = useNavigate()
  return <form className="manga-search-form" role="search" onSubmit={(event) => {
    event.preventDefault()
    if (value.trim()) navigate(`/search?q=${encodeURIComponent(value.trim())}`)
  }}>
    <input aria-label="Search manga" type="search" placeholder="Search manga titles…" maxLength={200} value={value} onChange={(event) => setValue(event.target.value)} />
    <button type="submit" disabled={!value.trim()}>Search</button>
  </form>
}
