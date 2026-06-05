import { useState } from 'react'
import './AuthPage.css'

export default function LoginPage({ onNavigateAuth, onNavigateHome }) {
  const [showPassword, setShowPassword] = useState(false)

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
          <span><span>i</span>LovePDF</span>
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

          <div className="auth-social">
            <button type="button">
              <span className="auth-social__google">G</span>
              Google
            </button>
            <button type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.35 1.08 2.92.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.99c.85 0 1.7.12 2.5.35 1.9-1.29 2.74-1.02 2.74-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.58c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
              </svg>
              GitHub
            </button>
          </div>

          <div className="auth-divider"><span>or continue with email</span></div>

          <form className="auth-form">
            <label>
              <span>Email address</span>
              <input type="email" placeholder="you@example.com" autoComplete="email" />
            </label>
            <label>
              <span>Password</span>
              <div className="auth-password">
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password" />
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

            <div className="auth-row">
              <label className="auth-check">
                <input type="checkbox" defaultChecked />
                <span>Remember me</span>
              </label>
              <button className="auth-link" type="button">Forgot password?</button>
            </div>

            <button className="auth-submit" type="submit">
              Sign In
              <span aria-hidden="true">-&gt;</span>
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
