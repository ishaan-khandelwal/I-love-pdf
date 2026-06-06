import { useState, useRef, useEffect } from 'react'
import { toolData } from '../data/toolData.js'
import './Header.css'

const menuCategories = [
  {
    title: 'Organize PDF',
    tools: ['merge', 'split', 'organize-pdf', 'scan-to-pdf'],
  },
  {
    title: 'Optimize PDF',
    tools: ['compress', 'repair-pdf', 'ocr-pdf'],
  },
  {
    title: 'Convert to PDF',
    tools: ['word-to-pdf', 'powerpoint-to-pdf', 'excel-to-pdf', 'jpg-to-pdf', 'html-to-pdf'],
  },
  {
    title: 'Convert from PDF',
    tools: ['pdf-to-word', 'pdf-to-powerpoint', 'pdf-to-excel', 'pdf-to-jpg', 'pdf-to-pdfa'],
  },
  {
    title: 'Edit PDF',
    tools: ['edit-pdf', 'rotate', 'page-numbers', 'watermark', 'crop-pdf', 'pdf-forms'],
  },
  {
    title: 'PDF Security',
    tools: ['unlock-pdf', 'protect-pdf', 'sign-pdf', 'redact-pdf', 'compare-pdf'],
  },
  {
    title: 'PDF Intelligence',
    tools: ['ai-summarizer', 'translate-pdf'],
  },
]

function getToolByIdLocal(id) {
  return toolData.find((t) => t.id === id)
}

export default function Header({ onNavigate, onNavigateAuth, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToolClick = (toolId) => {
    setMenuOpen(false)
    setMobileOpen(false)
    onNavigate(toolId)
  }

  return (
    <header className="header" id="site-header">
      <nav className="header__nav">
        <a
          className="header__logo"
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onNavigate(null)
          }}
          id="logo-link"
        >
          <svg className="header__logo-icon" viewBox="0 0 40 40" width="36" height="36">
            <rect width="40" height="40" rx="10" fill="#e5322d" />
            <path d="M10 28V12h6.5c3.5 0 5.5 2 5.5 5s-2 5-5.5 5H14v6h-4zm4-10h2.2c1.3 0 2-.7 2-2s-.7-2-2-2H14v4z" fill="#fff" />
          </svg>
          <span className="header__logo-text">
            Docloom
          </span>
        </a>

        <div className="header__center" ref={menuRef}>
          <button
            className={`header__menu-trigger ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            id="all-tools-menu"
            type="button"
          >
            All PDF tools
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {menuOpen && (
            <div className="header__mega-menu" id="mega-menu">
              <div className="mega-menu__grid">
                {menuCategories.map((cat) => (
                  <div className="mega-menu__column" key={cat.title}>
                    <h4 className="mega-menu__title">{cat.title}</h4>
                    <ul className="mega-menu__list">
                      {cat.tools.map((toolId) => {
                        const tool = getToolByIdLocal(toolId)
                        if (!tool) return null
                        return (
                          <li key={tool.id}>
                            <button
                              className={`mega-menu__item ${!tool.available ? 'mega-menu__item--disabled' : ''}`}
                              onClick={() => tool.available && handleToolClick(tool.id)}
                              type="button"
                            >
                              <span
                                className="mega-menu__dot"
                                style={{ backgroundColor: tool.color }}
                              />
                              <span className="mega-menu__label">{tool.title}</span>
                              {!tool.available && <span className="mega-menu__badge">Soon</span>}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="header__actions">
          {user ? (
            <>
              <span className="header__user-greeting" style={{ marginRight: '16px', fontWeight: 500, color: '#333' }}>
                Hi, {user.fullName}!
              </span>
              <button className="header__login" type="button" id="logout-btn" onClick={onLogout}>Log out</button>
            </>
          ) : (
            <>
              <button className="header__login" type="button" id="login-btn" onClick={() => onNavigateAuth('login')}>Log in</button>
              <button className="header__signup" type="button" id="signup-btn" onClick={() => onNavigateAuth('signup')}>Sign up</button>
            </>
          )}
        </div>

        <button
          className={`header__hamburger ${mobileOpen ? 'active' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          type="button"
          id="hamburger-btn"
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {mobileOpen && (
        <div className="header__mobile-menu" id="mobile-menu">
          <div className="mobile-menu__inner">
            {menuCategories.map((cat) => (
              <div className="mobile-menu__section" key={cat.title}>
                <h4 className="mobile-menu__title">{cat.title}</h4>
                {cat.tools.map((toolId) => {
                  const tool = getToolByIdLocal(toolId)
                  if (!tool) return null
                  return (
                    <button
                      key={tool.id}
                      className={`mobile-menu__item ${!tool.available ? 'mobile-menu__item--disabled' : ''}`}
                      onClick={() => tool.available && handleToolClick(tool.id)}
                      type="button"
                    >
                      <span className="mega-menu__dot" style={{ backgroundColor: tool.color }} />
                      {tool.title}
                      {!tool.available && <span className="mega-menu__badge">Soon</span>}
                    </button>
                  )
                })}
              </div>
            ))}
            <div className="mobile-menu__auth">
              {user ? (
                <>
                  <span className="mobile-menu__user-greeting" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Hi, {user.fullName}!
                  </span>
                  <button className="header__login" type="button" onClick={onLogout}>Log out</button>
                </>
              ) : (
                <>
                  <button className="header__login" type="button" onClick={() => { setMobileOpen(false); onNavigateAuth('login'); }}>Log in</button>
                  <button className="header__signup" type="button" onClick={() => { setMobileOpen(false); onNavigateAuth('signup'); }}>Sign up</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
