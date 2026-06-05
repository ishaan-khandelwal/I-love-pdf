import { useState } from 'react'
import { categories, getToolsByCategory } from '../data/toolData.js'
import ToolCard from '../components/ToolCard.jsx'
import './HomePage.css'

const workWays = [
  {
    title: 'Work offline with Desktop',
    description: 'Batch edit and manage documents locally, with no internet and no limits.',
    tone: 'desktop',
  },
  {
    title: 'On-the-go with Mobile',
    description: 'Keep your favorite PDF tools in your pocket and continue projects anywhere.',
    tone: 'mobile',
  },
  {
    title: 'Built for business',
    description: 'Automate document management, onboard teams, and scale with flexible plans.',
    tone: 'business',
  },
]

const trustBadges = ['ISO 27001 certified', 'Encrypted processing', 'PDF Association member']

export default function HomePage({ onNavigate }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const filteredTools = getToolsByCategory(activeFilter)
  const visibleTools = activeFilter === 'workflows' ? [] : filteredTools
  const filterItems = [
    ...categories.slice(0, 1),
    { id: 'workflows', label: 'Workflows' },
    ...categories.slice(1),
  ]

  return (
    <main className="home" id="home-page">
      <div className="home__bg-pattern" />

      <section className="hero" id="hero-section">
        <div className="hero__content">
          <div className="hero__pill">
            <span className="hero__pill-badge">New</span>
            <span className="hero__pill-text">AI Summarizer now available</span>
          </div>
          <h1 className="hero__title">
            Every tool you need to work with PDFs in <span>one place</span>
          </h1>
          <p className="hero__subtitle">
            Every tool you need to use PDFs, at your fingertips. All are <strong>100% free</strong> and easy to use!
            Merge, split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks.
          </p>
        </div>
      </section>

      <section className="filter-bar" id="filter-bar">
        <div className="filter-bar__inner" role="tablist" aria-label="PDF tool categories">
          {filterItems.map((cat) => (
            <button
              key={cat.id}
              className={`filter-tag ${activeFilter === cat.id ? 'filter-tag--active' : ''}`}
              onClick={() => setActiveFilter(cat.id)}
              type="button"
              id={`filter-${cat.id}`}
              role="tab"
              aria-selected={activeFilter === cat.id}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      <section className="tool-grid" id="tool-grid">
        <div className="tool-grid__inner">
          {visibleTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onClick={onNavigate} />
          ))}
          {(activeFilter === 'all' || activeFilter === 'workflows') && (
            <button className="workflow-card" type="button">
              <span className="workflow-card__badge">Workflow</span>
              <span className="workflow-card__icon" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                  <path d="M7 8h7v7H7V8Zm13 0h7v7h-7V8ZM7 20h7v7H7v-7Zm13 0h7v7h-7v-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M14 11.5h6M14 23.5h6M10.5 15v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="workflow-card__title">Create a workflow</span>
              <span className="workflow-card__desc">
                Chain your favorite PDF tools, automate repeat tasks, and reuse the flow anytime.
              </span>
              <span className="workflow-card__cta">Create workflow</span>
            </button>
          )}
        </div>
      </section>

      <section className="work-ways" id="work-ways">
        <div className="section-heading">
          <h2>Work your way</h2>
          <p>Choose the setup that fits the document job in front of you.</p>
        </div>
        <div className="work-ways__bento">
          {workWays.map((item, index) => (
            <article className={`work-way-bento work-way-bento--${index}`} key={item.title}>
              <div className="work-way-bento__content">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <div className={`work-way-bento__visual work-way-bento__visual--${item.tone}`} aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="premium-band" id="premium-band">
        <div className="premium-band__copy">
          <span className="premium-band__eyebrow">Premium</span>
          <h2>Get more from every PDF task</h2>
          <p>
            Unlock offline work, advanced OCR, secure e-signatures, and reusable workflows for high-volume document days.
          </p>
        </div>
        <button className="premium-band__button" type="button">Get Premium</button>
      </section>

      <section className="image-product" id="image-product">
        <div className="image-product__media" aria-hidden="true">
          <div className="image-product__tile image-product__tile--one" />
          <div className="image-product__tile image-product__tile--two" />
          <div className="image-product__tile image-product__tile--three" />
        </div>
        <div className="image-product__copy">
          <span className="image-product__eyebrow">iLoveIMG</span>
          <h2>Image editing made simple</h2>
          <p>
            Bring the same speed and clarity to image compression, resizing, enhancement, and conversion.
          </p>
          <button type="button">Go to iLoveIMG</button>
        </div>
      </section>

      <section className="features" id="features-section">
        <div className="section-heading">
          <h2>The PDF software trusted by millions</h2>
          <p>Work quickly while keeping your files protected and your documents under control.</p>
        </div>
        <div className="features__inner">
          <div className="feature-card">
            <div className="feature-card__icon feature-card__icon--secure">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3>Secure PDF processing</h3>
            <p>Files are handled securely, encrypted during processing, and cleared when the job is finished.</p>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon feature-card__icon--cloud">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
              </svg>
            </div>
            <h3>Cloud-based processing</h3>
            <p>No software to install. Open a browser, choose a tool, and keep working from any device.</p>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon feature-card__icon--free">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <h3>Free to use</h3>
            <p>Core PDF jobs stay simple and accessible, with no hidden costs or required sign-up.</p>
          </div>
        </div>
        <div className="trust-strip" aria-label="Trust badges">
          {trustBadges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </section>
    </main>
  )
}
