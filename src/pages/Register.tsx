import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthError, signUp } from '../services/auth'
import { useAuth } from '../hooks/useAuth'

const Register = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const next = searchParams.get('next')
  const destination = next?.startsWith('/') ? next : '/'

  if (isAuthenticated) return <Navigate replace to={destination} />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const result = await signUp(displayName, email, password)
      if (result.needsEmailConfirmation) {
        setSuccess('Account created. Check your email to confirm it, then sign in.')
        setPassword('')
        setConfirmPassword('')
      } else {
        navigate(destination, { replace: true })
      }
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Unable to create the account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <div className="auth-kicker">MGX ACCOUNT</div>
        <h1>Create account</h1>
        <p className="auth-copy">Create your MGX reader account.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Display name</span>
            <input
              autoComplete="name"
              autoFocus
              maxLength={60}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Reader name"
              required
              type="text"
              value={displayName}
            />
          </label>

          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            <span>Password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              type="password"
              value={password}
            />
          </label>

          <label>
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter it again"
              required
              type="password"
              value={confirmPassword}
            />
          </label>

          {error && <div className="auth-message auth-error" role="alert">{error}</div>}
          {success && <div className="auth-message auth-success" role="status">{success}</div>}

          <button className="auth-submit" disabled={submitting || Boolean(success)} type="submit">
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}>Sign in</Link>
        </p>
      </div>
    </section>
  )
}

export default Register
