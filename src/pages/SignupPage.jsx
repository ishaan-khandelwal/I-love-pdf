import { useState } from 'react'
import './AuthPage.css'

export default function SignupPage({ onNavigateAuth, onNavigateHome, onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName || !email || !password) {
      setError('Please fill in all fields.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Signup failed.')
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
          <h1>Start faster with <strong>every</strong> PDF</h1>
          <p>Create a workspace for secure PDF tools, saved files, and faster document workflows.</p>
        </div>

        <ul className="auth-brand__list">
          <li>Merge, split and compress PDF files instantly</li>
          <li>Convert Word, Excel, PPT to and from PDF</li>
          <li>256-bit SSL encryption on all files</li>
          <li>Process up to 25 files at once with Pro</li>
        </ul>
      </section>

      <section className="auth-panel" aria-labelledby="signup-heading">
        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Authentication">
            <button className="auth-tabs__item" onClick={() => onNavigateAuth('login')} type="button">Sign In</button>
            <button className="auth-tabs__item auth-tabs__item--active" type="button">
              Create Account
            </button>
          </div>

          <div className="auth-card__heading">
            <h2 id="signup-heading">Create account</h2>
            <p>Set up your PDF workspace in less than a minute.</p>
          </div>

          {error && (
            <div className="auth-error-alert" style={{ backgroundColor: '#FDE8E8', color: '#E53E3E', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', border: '1px solid #FEB2B2' }}>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Full name</span>
              <input
                type="text"
                placeholder="XYZ"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>
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
                  autoComplete="new-password"
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
              {loading ? 'Creating Account...' : 'Create Account'}
              <span aria-hidden="true"> -&gt;</span>
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <button onClick={() => onNavigateAuth('login')} type="button">Sign in</button>
          </p>
        </div>
      </section>
    </main>
  )
}
