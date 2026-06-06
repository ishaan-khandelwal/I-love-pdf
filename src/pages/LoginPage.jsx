import { useState } from 'react'
import './AuthPage.css'

export default function LoginPage({ onNavigateAuth, onNavigateHome, onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Login failed.')
      }
      onLoginSuccess(data.user, data.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <button className="auth-brand__logo" onClick={onNavigateHome} type="button">
          <span className="auth-brand__mark">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3h8l4 4v14H6V3z" fill="currentColor" />
              <path d="M14 3v5h5" fill="none" stroke="#fff" strokeWidth="1.8" />
              <path d="M9 11h6M9 14h6M9 17h4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span>Docloom</span>
        </button>

        <div className="auth-brand__copy">
          <span className="auth-brand__pill">PDF TOOLKIT</span>
          <h1>Work smarter with <strong>every</strong> PDF</h1>
          <p>Merge, compress, convert, and edit PDFs in seconds, all in one trusted workspace.</p>
        </div>

        <ul className="auth-brand__list">
          <li>Merge, split and compress PDF files instantly</li>
          <li>Convert Word, Excel, PPT to and from PDF</li>
          <li>256-bit SSL encryption on all files</li>
          <li>Process up to 25 files at once with Pro</li>
        </ul>
      </section>

      <section className="auth-panel" aria-labelledby="login-heading">
        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Authentication">
            <button className="auth-tabs__item auth-tabs__item--active" type="button">Sign In</button>
            <button className="auth-tabs__item" onClick={() => onNavigateAuth('signup')} type="button">
              Create Account
            </button>
          </div>

          <div className="auth-card__heading">
            <h2 id="login-heading">Welcome back</h2>
            <p>Sign in to access your PDF workspace.</p>
          </div>

          {error && (
            <div className="auth-error-alert" style={{ backgroundColor: '#FDE8E8', color: '#E53E3E', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', border: '1px solid #FEB2B2' }}>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Email address</span>
              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Password</span>
              <div className="auth-password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                  type="button"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </button>
              </div>
            </label>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
              <span aria-hidden="true"> -&gt;</span>
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{' '}
            <button onClick={() => onNavigateAuth('signup')} type="button">Create one free</button>
          </p>
        </div>
      </section>
    </main>
  )
}
