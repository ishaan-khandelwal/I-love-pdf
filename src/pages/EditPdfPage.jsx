import { useState, useRef, useEffect } from 'react'
import { getToolById } from '../data/toolData.js'
import './EditPdfPage.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/pdf'

// Dynamic loader for PDF.js script and worker from CDNJS
const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      const pdfjs = window['pdfjs-dist/build/pdf']
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      window.pdfjsLib = pdfjs
      resolve(pdfjs)
    }
    script.onerror = () => {
      reject(new Error('Failed to load PDF rendering engine.'))
    }
    document.head.appendChild(script)
  })
}

// Subcomponent: Sidebar PDF Page Thumbnail
function PdfThumbnail({ pageIndex, pdfDoc, isActive, onClick }) {
  const canvasRef = useRef(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const renderThumb = async () => {
      if (!pdfDoc || !canvasRef.current) return
      setLoading(true)
      try {
        const page = await pdfDoc.getPage(pageIndex + 1)
        const viewport = page.getViewport({ scale: 0.2 })
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height

        if (active) {
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          }
          await page.render(renderContext).promise
          setLoading(false)
        }
      } catch (err) {
        console.error('Error rendering thumbnail:', err)
      }
    }
    renderThumb()
    return () => {
      active = false
    }
  }, [pdfDoc, pageIndex])

  return (
    <div
      className={`edit-pdf-thumbnail ${isActive ? 'edit-pdf-thumbnail--active' : ''}`}
      onClick={onClick}
    >
      <div className="edit-pdf-thumbnail__canvas-wrapper">
        {loading ? (
          <div style={{ fontSize: '10px', color: '#888', padding: '10px' }}>Loading...</div>
        ) : null}
        <canvas ref={canvasRef} style={{ display: loading ? 'none' : 'block' }} />
      </div>
      <span className="edit-pdf-thumbnail__page-num">Page {pageIndex + 1}</span>
    </div>
  )
}

// Subcomponent: Main PDF Page Card with annotation capabilities
function PdfPageCard({
  pageIndex,
  pdfDoc,
  dimensions,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  activeTool,
  activeColor,
  activeFontSize,
  activeThickness,
  isActive,
  onSetActive,
}) {
  const canvasRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState(null)
  const [editingTextId, setEditingTextId] = useState(null)

  const dragInfoRef = useRef(null)

  useEffect(() => {
    let active = true
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return
      setLoading(true)
      try {
        const page = await pdfDoc.getPage(pageIndex + 1)
        const viewport = page.getViewport({ scale: 1.0 })
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height

        if (active) {
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          }
          await page.render(renderContext).promise
          setLoading(false)
        }
      } catch (err) {
        console.error('Error rendering page:', err)
      }
    }
    renderPage()
    return () => {
      active = false
    }
  }, [pdfDoc, pageIndex])

  if (!dimensions) return null
  const { width, height } = dimensions

  // Coordinate math and event handlers
  const handleMouseDown = (e) => {
    onSetActive()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (activeTool === 'draw') {
      setIsDrawing(true)
      setCurrentPath([[Math.round(x), Math.round(y)]])
    } else if (activeTool === 'text') {
      // Prevent spawning overlapping inputs if editing
      if (editingTextId) return

      const newId = `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      onAddAnnotation({
        id: newId,
        pageIndex,
        type: 'text',
        text: 'Type text here',
        x: Math.round(x),
        y: Math.round(y),
        fontSize: activeFontSize,
        color: activeColor,
      })
      setEditingTextId(newId)
    }
  }

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentPath) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCurrentPath((prev) => [...prev, [Math.round(x), Math.round(y)]])
  }

  const handleMouseUp = () => {
    if (isDrawing && currentPath && currentPath.length > 1) {
      onAddAnnotation({
        id: `draw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pageIndex,
        type: 'drawing',
        points: currentPath,
        color: activeColor,
        thickness: activeThickness,
      })
    }
    setIsDrawing(false)
    setCurrentPath(null)
  }

  // Draggable Textboxes
  const handleTextDragStart = (e, ann) => {
    e.preventDefault()
    e.stopPropagation()
    onSetActive()
    
    const startX = e.clientX
    const startY = e.clientY
    const initX = ann.x
    const initY = ann.y

    dragInfoRef.current = {
      annId: ann.id,
      startX,
      startY,
      initX,
      initY,
    }

    window.addEventListener('mousemove', handleTextDragMove)
    window.addEventListener('mouseup', handleTextDragEnd)
  }

  const handleTextDragMove = (e) => {
    if (!dragInfoRef.current) return
    const { annId, startX, startY, initX, initY } = dragInfoRef.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    // Constrain relative bounding boundaries
    let newX = Math.round(initX + dx)
    let newY = Math.round(initY + dy)
    newX = Math.max(0, Math.min(width - 50, newX))
    newY = Math.max(0, Math.min(height - 20, newY))

    onUpdateAnnotation(annId, { x: newX, y: newY })
  }

  const handleTextDragEnd = () => {
    dragInfoRef.current = null
    window.removeEventListener('mousemove', handleTextDragMove)
    window.removeEventListener('mouseup', handleTextDragEnd)
  }

  return (
    <div
      className={`edit-pdf-page-card ${isActive ? 'edit-pdf-page-card--active' : ''}`}
      id={`page-card-${pageIndex}`}
    >
      <div className="edit-pdf-page-card__header">
        <span>Page {pageIndex + 1}</span>
        <span>
          {Math.round(width)} × {Math.round(height)} pt
        </span>
      </div>

      <div className="edit-pdf-page-wrapper" style={{ width, height }}>
        {loading ? (
          <div className="edit-pdf-loading">
            <div className="edit-pdf-loading__spinner" />
            <span>Rendering PDF page...</span>
          </div>
        ) : null}

        <canvas
          ref={canvasRef}
          className="edit-pdf-page-canvas"
          style={{ width, height, display: loading ? 'none' : 'block' }}
        />

        {/* Action capture overlays */}
        {!loading ? (
          <div
            className={`edit-pdf-annotation-layer edit-pdf-annotation-layer--${activeTool}-tool`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        ) : null}

        {/* SVG Annotations (Draw Paths) */}
        {!loading ? (
          <svg
            className="edit-pdf-svg-overlay"
            viewBox={`0 0 ${width} ${height}`}
            style={{ width, height }}
          >
            {annotations
              .filter((ann) => ann.type === 'drawing')
              .map((ann) => (
                <path
                  key={ann.id}
                  d={ann.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')}
                  stroke={ann.color}
                  strokeWidth={ann.thickness}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

            {isDrawing && currentPath ? (
              <path
                d={currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')}
                stroke={activeColor}
                strokeWidth={activeThickness}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </svg>
        ) : null}

        {/* Overlay interactive draggable Text Inputs */}
        {!loading
          ? annotations
              .filter((ann) => ann.type === 'text')
              .map((ann) => {
                const isEditing = editingTextId === ann.id
                return (
                  <div
                    key={ann.id}
                    className={`edit-pdf-text-box ${isEditing ? 'edit-pdf-text-box--selected' : ''}`}
                    style={{
                      left: ann.x,
                      top: ann.y,
                      color: ann.color,
                      fontSize: `${ann.fontSize}px`,
                    }}
                    onMouseDown={(e) => handleTextDragStart(e, ann)}
                  >
                    {isEditing ? (
                      <input
                        className="edit-pdf-text-box__input"
                        style={{ color: ann.color, fontSize: `${ann.fontSize}px` }}
                        value={ann.text}
                        onChange={(e) => onUpdateAnnotation(ann.id, { text: e.target.value })}
                        onBlur={() => setEditingTextId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingTextId(null)
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="edit-pdf-text-box__content"
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          setEditingTextId(ann.id)
                        }}
                      >
                        {ann.text || 'Double click to edit'}
                      </span>
                    )}
                    <button
                      className="edit-pdf-text-box__delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteAnnotation(ann.id)
                      }}
                      title="Delete annotation"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                )
              })
          : null}
      </div>
    </div>
  )
}

// MAIN PAGE COMPONENT
export default function EditPdfPage({ onNavigate }) {
  const tool = getToolById('edit-pdf')
  
  // Script / document load state
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageDimensions, setPageDimensions] = useState({})

  // Workspace settings
  const [files, setFiles] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [status, setStatus] = useState('idle') // idle | uploading | processing | done | error
  const [statusMessage, setStatusMessage] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [resultName, setResultName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Interactive editing toolbar states
  const [activeTool, setActiveTool] = useState('text') // 'text' | 'draw'
  const [activeColor, setActiveColor] = useState('#000000')
  const [activeFontSize, setActiveFontSize] = useState(16)
  const [activeThickness, setActiveThickness] = useState(4)
  const [activePage, setActivePage] = useState(0)

  // Annotation states
  const [annotations, setAnnotations] = useState([])
  const [history, setHistory] = useState([]) // simple stack for undos

  // Standard premium color palette
  const colors = [
    { label: 'Black', hex: '#000000' },
    { label: 'Blue', hex: '#2563eb' },
    { label: 'Red', hex: '#dc2626' },
    { label: 'Green', hex: '#16a34a' },
    { label: 'Orange', hex: '#ea580c' },
    { label: 'Purple', hex: '#7c3aed' },
  ]

  // Initialize PDF.js engine
  useEffect(() => {
    loadPdfJs()
      .then(() => setPdfjsLoaded(true))
      .catch((err) => {
        setStatus('error')
        setStatusMessage(err.message)
      })
  }, [])

  // Load PDF document from object URL
  useEffect(() => {
    if (!pdfjsLoaded || !pdfUrl) return
    let active = true
    const loadDocument = async () => {
      try {
        const loadingTask = window.pdfjsLib.getDocument(pdfUrl)
        const doc = await loadingTask.promise
        if (active) {
          setPdfDoc(doc)
          
          // Pre-load all page dimension limits
          const dims = {}
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i)
            const viewport = page.getViewport({ scale: 1.0 })
            dims[i - 1] = { width: viewport.width, height: viewport.height }
          }
          setPageDimensions(dims)
          setActivePage(0)
        }
      } catch (err) {
        console.error('PDF.js document load error:', err)
        if (active) {
          setStatus('error')
          setStatusMessage('Failed to load PDF inside browser preview: ' + err.message)
        }
      }
    }
    loadDocument()
    return () => {
      active = false
    }
  }, [pdfUrl, pdfjsLoaded])

  if (!tool) {
    return (
      <div className="tool-page" style={{ paddingTop: 'calc(var(--header-height) + 60px)', textAlign: 'center' }}>
        <h2>Tool not found</h2>
        <button onClick={() => onNavigate(null)}>Go home</button>
      </div>
    )
  }

  // Handle local file selection and background server upload
  const handleFileSelect = async (selectedFiles) => {
    if (!selectedFiles?.length) return
    setStatus('uploading')
    setStatusMessage('Uploading and parsing your file...')
    setDownloadUrl('')

    const file = selectedFiles[0]

    // Capture local URL instantly for browser rendering
    const url = URL.createObjectURL(file)
    setPdfUrl(url)

    const formData = new FormData()
    formData.append('files', file)

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Upload failed')

      const newFiles = data.files || []
      setSelectedIds(newFiles.map((f) => f._id))
      setFiles([
        {
          name: file.name,
          size: file.size,
          id: newFiles[0]?._id,
        },
      ])
      setStatus('idle')
      setStatusMessage('')
    } catch (error) {
      setStatus('error')
      setStatusMessage(error.message)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length) handleFileSelect(droppedFiles)
  }
  // Annotation Mutation Helpers
  const addAnnotation = (newAnn) => {
    setHistory((prev) => [...prev, annotations])
    setAnnotations((prev) => [...prev, newAnn])
  }

  const updateAnnotation = (id, fields) => {
    setAnnotations((prev) => prev.map((ann) => (ann.id === id ? { ...ann, ...fields } : ann)))
  }

  const deleteAnnotation = (id) => {
    setHistory((prev) => [...prev, annotations])
    setAnnotations((prev) => prev.filter((ann) => ann.id !== id))
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setAnnotations(prev)
    setHistory((prevH) => prevH.slice(0, -1))
  }

  const handleClearAll = () => {
    if (annotations.length === 0) return
    if (window.confirm('Are you sure you want to discard all annotations?')) {
      setHistory((prev) => [...prev, annotations])
      setAnnotations([])
    }
  }

  const resetAll = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
    }
    setFiles([])
    setSelectedIds([])
    setStatus('idle')
    setStatusMessage('')
    setDownloadUrl('')
    setResultName('')
    setPdfUrl('')
    setPdfDoc(null)
    setPageDimensions({})
    setAnnotations([])
    setHistory([])
    setActivePage(0)
  }

  const scrollToPage = (idx) => {
    setActivePage(idx)
    const el = document.getElementById(`page-card-${idx}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Send coordinates list to the backend to redraw PDF
  const handleProcess = async () => {
    if (selectedIds.length !== 1) {
      setStatus('error')
      setStatusMessage('Please select exactly one PDF to edit.')
      return
    }

    setStatus('processing')
    setStatusMessage('Baking annotations into your PDF...')
    setDownloadUrl('')

    // Payload maps annotations and formats coordinates
    const payloadAnnotations = annotations.map((ann) => {
      if (ann.type === 'text') {
        return {
          pageIndex: ann.pageIndex,
          type: 'text',
          text: ann.text,
          x: ann.x,
          y: ann.y,
          fontSize: ann.fontSize,
          color: ann.color,
        }
      } else {
        return {
          pageIndex: ann.pageIndex,
          type: 'drawing',
          points: ann.points,
          thickness: ann.thickness,
          color: ann.color,
        }
      }
    })

    try {
      const response = await fetch(`${API_BASE}/edit-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: selectedIds[0],
          annotations: payloadAnnotations,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Edit failed')

      if (data.file?._id) {
        setDownloadUrl(`${API_BASE}/download/${data.file._id}`)
        setResultName(data.file.originalName)
      }
      setStatus('done')
      setStatusMessage('Edits baked successfully!')
    } catch (error) {
      setStatus('error')
      setStatusMessage(error.message)
    }
  }

  // Switch layouts if done
  if (status === 'done') {
    return (
      <main className="tool-page" id="tool-page-edit-pdf">
        <div className="tool-page__header" style={{ backgroundColor: tool.color }}>
          <div className="tool-page__header-inner">
            <h1 className="tool-page__title">Edit Completed!</h1>
            <p className="tool-page__desc">Your PDF edits have been baked successfully.</p>
          </div>
        </div>
        <div className="tool-page__body" style={{ background: '#fafafa' }}>
          <div className="tool-page__container">
            <div className="download-section" id="download-section">
              <div className="download-section__icon" style={{ backgroundColor: tool.colorLight }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={tool.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className="download-section__title">Your file is ready!</h2>
              <p className="download-section__name">{resultName}</p>
              {downloadUrl ? (
                <a
                  className="download-btn"
                  href={downloadUrl}
                  download
                  style={{ backgroundColor: tool.color }}
                  id="download-btn"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Edited PDF
                </a>
              ) : null}
              <button className="download-section__restart" onClick={resetAll} type="button">
                Edit another file
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Switch layouts if uploading
  if (status === 'uploading') {
    return (
      <div className="edit-pdf-container">
        <div className="edit-pdf-toolbar">
          <div className="edit-pdf-toolbar__left">
            <button className="edit-pdf-toolbar__back-btn" onClick={() => onNavigate(null)} type="button">
              ← Go back
            </button>
            <span className="edit-pdf-toolbar__title">Uploading PDF...</span>
          </div>
        </div>
        <div className="edit-pdf-page__uploading">
          <div className="edit-pdf-page__uploading-spinner" />
          <p>{statusMessage}</p>
        </div>
      </div>
    )
  }

  // Interactive PDF Workspace
  if (pdfDoc && files.length > 0) {
    return (
      <div className="edit-pdf-container">
        {/* Sticky Toolbar */}
        <div className="edit-pdf-toolbar">
          <div className="edit-pdf-toolbar__left">
            <button className="edit-pdf-toolbar__back-btn" onClick={resetAll} type="button">
              ← Cancel
            </button>
            <span className="edit-pdf-toolbar__title">Editing: {files[0].name}</span>
          </div>

          <div className="edit-pdf-toolbar__center">
            {/* Tool Selectors */}
            <button
              className={`edit-pdf-toolbar__tool-btn ${activeTool === 'text' ? 'edit-pdf-toolbar__tool-btn--active' : ''}`}
              onClick={() => setActiveTool('text')}
              title="Add text to document"
              type="button"
            >
              📝 Text
            </button>
            <button
              className={`edit-pdf-toolbar__tool-btn ${activeTool === 'draw' ? 'edit-pdf-toolbar__tool-btn--active' : ''}`}
              onClick={() => setActiveTool('draw')}
              title="Draw freehand scribbles"
              type="button"
            >
              ✏️ Pen
            </button>

            <span className="edit-pdf-toolbar__divider" />

            {/* Color chip triggers */}
            <div className="edit-pdf-toolbar__styles">
              <div className="edit-pdf-toolbar__colors">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    className={`edit-pdf-toolbar__color-dot ${activeColor === c.hex ? 'edit-pdf-toolbar__color-dot--active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setActiveColor(c.hex)}
                    title={c.label}
                    type="button"
                  />
                ))}
              </div>

              <span className="edit-pdf-toolbar__divider" />

              {/* Tool attributes sizes */}
              {activeTool === 'text' ? (
                <select
                  className="edit-pdf-toolbar__select"
                  value={activeFontSize}
                  onChange={(e) => setActiveFontSize(Number(e.target.value))}
                  title="Font Size"
                >
                  <option value={12}>12 px</option>
                  <option value={14}>14 px</option>
                  <option value={16}>16 px</option>
                  <option value={20}>20 px</option>
                  <option value={24}>24 px</option>
                  <option value={32}>32 px</option>
                  <option value={48}>48 px</option>
                </select>
              ) : (
                <select
                  className="edit-pdf-toolbar__select"
                  value={activeThickness}
                  onChange={(e) => setActiveThickness(Number(e.target.value))}
                  title="Line Thickness"
                >
                  <option value={2}>2 px</option>
                  <option value={4}>4 px</option>
                  <option value={6}>6 px</option>
                  <option value={8}>8 px</option>
                  <option value={10}>10 px</option>
                </select>
              )}
            </div>
          </div>

          <div className="edit-pdf-toolbar__actions">
            {/* Actions list */}
            <button
              className="edit-pdf-toolbar__action-btn"
              onClick={handleUndo}
              disabled={history.length === 0}
              title="Undo last edit"
              type="button"
            >
              Undo
            </button>
            <button
              className="edit-pdf-toolbar__action-btn"
              onClick={handleClearAll}
              disabled={annotations.length === 0}
              title="Remove all edits"
              type="button"
            >
              Clear
            </button>
            <button
              className="edit-pdf-toolbar__action-btn edit-pdf-toolbar__action-btn--primary"
              onClick={handleProcess}
              disabled={status === 'processing'}
              type="button"
            >
              {status === 'processing' ? 'Saving...' : 'Apply Edits'}
            </button>
          </div>
        </div>

        {/* Dual pane workspaces */}
        <div className="edit-pdf-workspace">
          {/* Sidebar thumb panels */}
          <div className="edit-pdf-sidebar">
            <h3 className="edit-pdf-sidebar__title">Pages</h3>
            {Array.from({ length: pdfDoc.numPages }).map((_, index) => (
              <PdfThumbnail
                key={index}
                pageIndex={index}
                pdfDoc={pdfDoc}
                isActive={activePage === index}
                onClick={() => scrollToPage(index)}
              />
            ))}
          </div>

          {/* Main big canvases area */}
          <div className="edit-pdf-canvas-area">
            {Array.from({ length: pdfDoc.numPages }).map((_, index) => (
              <PdfPageCard
                key={index}
                pageIndex={index}
                pdfDoc={pdfDoc}
                dimensions={pageDimensions[index]}
                annotations={annotations.filter((ann) => ann.pageIndex === index)}
                onAddAnnotation={addAnnotation}
                onUpdateAnnotation={updateAnnotation}
                onDeleteAnnotation={deleteAnnotation}
                activeTool={activeTool}
                activeColor={activeColor}
                activeFontSize={activeFontSize}
                activeThickness={activeThickness}
                isActive={activePage === index}
                onSetActive={() => setActivePage(index)}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Upload Selection / Drag-Drop Screen (Default)
  return (
    <main className="tool-page" id="tool-page-edit-pdf">
      <div className="tool-page__header" style={{ backgroundColor: tool.color }}>
        <div className="tool-page__header-inner">
          <button className="tool-page__back" onClick={() => onNavigate(null)} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            All tools
          </button>
          <h1 className="tool-page__title">Edit PDF</h1>
          <p className="tool-page__desc">Upload a PDF and add custom text annotations or freehand drawings directly in your browser.</p>
        </div>
      </div>

      <div className="tool-page__body">
        <div className="tool-page__container">
          <div
            className={`upload-zone ${isDragging ? 'upload-zone--active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            id="upload-zone"
          >
            <div className="upload-zone__icon" style={{ backgroundColor: tool.colorLight }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={tool.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <button
              className="upload-zone__button"
              style={{ backgroundColor: tool.color }}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Select PDF file
            </button>
            <p className="upload-zone__hint">or drop a PDF file here</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple={false}
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
              id="file-input"
            />
          </div>

          {statusMessage && status === 'error' && (
            <div className="status-bar status-bar--error" id="status-message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {statusMessage}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
