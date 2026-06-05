import './ToolCard.css'

export default function ToolCard({ tool, onClick }) {
  return (
    <button
      className={`tool-card ${!tool.available ? 'tool-card--disabled' : ''}`}
      onClick={() => tool.available && onClick(tool.id)}
      type="button"
      id={`tool-card-${tool.id}`}
      disabled={!tool.available}
    >
      <div className="tool-card__icon" style={{ backgroundColor: tool.colorLight }}>
        <ToolIcon toolId={tool.id} color={tool.color} />
      </div>
      <h3 className="tool-card__title">{tool.title}</h3>
      <p className="tool-card__desc">{tool.description}</p>
      {!tool.available && <span className="tool-card__soon">Coming soon</span>}
    </button>
  )
}

function ToolIcon({ toolId, color }) {
  const size = 32
  // Reusable rounded-square icon with operation symbol
  switch (toolId) {
    case 'merge':
      return (
        <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
          <rect x="2" y="2" width="26" height="26" rx="6" fill={color} opacity="0.85"/>
          <rect x="22" y="22" width="26" height="26" rx="6" fill={color}/>
          <path d="M16 12v4l-6-6 6-6v4h4v4h-4zM34 38v-4l6 6-6 6v-4h-4v-4h4z" fill="#fff" opacity="0.9"/>
        </svg>
      )
    case 'split':
      return (
        <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
          <rect x="2" y="2" width="26" height="26" rx="6" fill={color} opacity="0.85"/>
          <rect x="22" y="22" width="26" height="26" rx="6" fill={color}/>
          <path d="M10 16h4l-6-6-6 6h4v4h4v-4zM40 34h-4l6 6 6-6h-4v-4h-4v4z" fill="#fff" opacity="0.9"/>
        </svg>
      )
    case 'compress':
      return (
        <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
          <rect x="0" y="0" width="22" height="22" rx="5" fill={color}/>
          <rect x="28" y="0" width="22" height="22" rx="5" fill={color}/>
          <rect x="0" y="28" width="22" height="22" rx="5" fill={color}/>
          <rect x="28" y="28" width="22" height="22" rx="5" fill={color}/>
          <path d="M36 42v-4l5 5-5 5v-4h-4v-4h4zM42 8c0-.5-.4-.9-.9-.9s-.9.4-.9.9v4l-5-5 5-5v4h4v4h-4z" fill="#fff" opacity="0.85"/>
        </svg>
      )
    case 'rotate':
      return (
        <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
          <rect x="5" y="5" width="40" height="40" rx="8" fill={color}/>
          <path d="M25 14a11 11 0 1 0 11 11" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M36 19v-6h-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      )
    case 'watermark':
      return (
        <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
          <rect x="5" y="5" width="40" height="40" rx="8" fill={color}/>
          <text x="25" y="30" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold" opacity="0.7" transform="rotate(-30 25 25)">Aa</text>
        </svg>
      )
    case 'page-numbers':
      return (
        <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
          <rect x="5" y="5" width="40" height="40" rx="8" fill={color}/>
          <rect x="14" y="12" width="22" height="20" rx="2" fill="none" stroke="#fff" strokeWidth="2"/>
          <text x="25" y="40" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">1</text>
        </svg>
      )
    case 'crop-pdf':
      return (
        <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
          <rect x="5" y="5" width="40" height="40" rx="8" fill={color}/>
          <path d="M16 10v28h28M10 34h28V6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </svg>
      )
    case 'unlock-pdf':
      return (
        <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
          <rect x="5" y="5" width="40" height="40" rx="8" fill={color}/>
          <rect x="17" y="23" width="16" height="14" rx="3" fill="#fff"/>
          <path d="M21 23v-5a4 4 0 0 1 8 0" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </svg>
      )
    case 'protect-pdf':
      return (
        <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
          <rect x="5" y="5" width="40" height="40" rx="8" fill={color}/>
          <rect x="17" y="23" width="16" height="14" rx="3" fill="#fff"/>
          <path d="M21 23v-5a4 4 0 0 1 8 0v5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </svg>
      )
    default:
      // Generic PDF icon for all other tools
      return (
        <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
          <rect x="5" y="5" width="40" height="40" rx="8" fill={color}/>
          <rect x="15" y="13" width="20" height="24" rx="2" fill="none" stroke="#fff" strokeWidth="2"/>
          <path d="M20 20h10M20 25h10M20 30h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )
  }
}
