import { useState, useRef } from 'react'
import { getToolById } from '../data/toolData.js'
import './ToolPage.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/pdf'

export default function ToolPage({ toolId, onNavigate }) {
  const tool = getToolById(toolId)
  const [files, setFiles] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [status, setStatus] = useState('idle') // idle | uploading | processing | done | error
  const [statusMessage, setStatusMessage] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [resultName, setResultName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Option states
  const [pageRange, setPageRange] = useState('1-1')
  const [rotateDegrees, setRotateDegrees] = useState(90)
  const [watermarkText, setWatermarkText] = useState('Confidential')
  const [protectPassword, setProtectPassword] = useState('')
  const [cropMargins, setCropMargins] = useState('40,40,40,40')
  const [pageOrder, setPageOrder] = useState('1,2')
  const [htmlContent, setHtmlContent] = useState('<h1>Sample Webpage</h1>')

  if (!tool) {
    return (
      <div className="tool-page" style={{ paddingTop: 'calc(var(--header-height) + 60px)', textAlign: 'center' }}>
        <h2>Tool not found</h2>
        <button onClick={() => onNavigate(null)}>Go home</button>
      </div>
    )
  }

  const getOptionValue = () => {
    if (!tool.options) return {}
    switch (tool.options.valueKey) {
      case 'pageRange': return { pageRange }
      case 'rotateDegrees': return { degrees: rotateDegrees }
      case 'watermarkText': return { watermarkText }
      case 'protectPassword': return { password: protectPassword }
      case 'cropMargins': return { cropMargins }
      case 'pageOrder': return { pageOrder }
      case 'htmlContent': return { htmlContent }
      default: return {}
    }
  }

  const setOptionValue = (value) => {
    if (!tool.options) return
    switch (tool.options.valueKey) {
      case 'pageRange': setPageRange(value); break
      case 'rotateDegrees': setRotateDegrees(Number(value)); break
      case 'watermarkText': setWatermarkText(value); break
      case 'protectPassword': setProtectPassword(value); break
      case 'cropMargins': setCropMargins(value); break
      case 'pageOrder': setPageOrder(value); break
      case 'htmlContent': setHtmlContent(value); break
    }
  }

  const getCurrentOptionValue = () => {
    if (!tool.options) return ''
    switch (tool.options.valueKey) {
      case 'pageRange': return pageRange
      case 'rotateDegrees': return rotateDegrees
      case 'watermarkText': return watermarkText
      case 'protectPassword': return protectPassword
      case 'cropMargins': return cropMargins
      case 'pageOrder': return pageOrder
      case 'htmlContent': return htmlContent
      default: return ''
    }
  }

  const handleFileSelect = async (selectedFiles) => {
    if (!selectedFiles?.length) return
    setStatus('uploading')
    setStatusMessage('Uploading your files...')
    setDownloadUrl('')

    const formData = new FormData()
    Array.from(selectedFiles).forEach((f) => formData.append('files', f))

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Upload failed')

      const newFiles = data.files || []
      setSelectedIds((prev) => [...prev, ...newFiles.map((f) => f._id)])
      setFiles((prev) => [...prev, ...Array.from(selectedFiles).map((f, i) => ({
        name: f.name,
        size: f.size,
        id: newFiles[i]?._id,
      }))])
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

  const handleProcess = async () => {
    if (toolId !== 'html-to-pdf' && !selectedIds.length) {
      setStatus('error')
      setStatusMessage('Please upload at least one file first.')
      return
    }

    if (toolId !== 'html-to-pdf') {
      if (tool.multiFile) {
        if (toolId === 'merge' && selectedIds.length < 2) {
          setStatus('error')
          setStatusMessage('Select at least two PDFs to merge.')
          return
        }
        if (['jpg-to-pdf', 'scan-to-pdf'].includes(toolId) && selectedIds.length < 1) {
          setStatus('error')
          setStatusMessage('Select at least one image to convert.')
          return
        }
      } else {
        if (selectedIds.length !== 1) {
          setStatus('error')
          setStatusMessage('Select exactly one file for this operation.')
          return
        }
      }
    }

    setStatus('processing')
    setStatusMessage(`Processing ${tool.title}...`)
    setDownloadUrl('')

    const body = {
      ...(toolId === 'html-to-pdf'
        ? {}
        : tool.multiFile
          ? { fileIds: selectedIds }
          : { fileId: selectedIds[0] }),
      ...getOptionValue(),
    }

    try {
      const response = await fetch(`${API_BASE}/${toolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Operation failed')

      if (data.file?._id) {
        setDownloadUrl(`${API_BASE}/download/${data.file._id}`)
        setResultName(data.file.originalName)
      }
      setStatus('done')
      setStatusMessage(`${tool.title} completed successfully!`)
    } catch (error) {
      setStatus('error')
      setStatusMessage(error.message)
    }
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    const fileId = files[index]?.id
    if (fileId) {
      setSelectedIds((prev) => prev.filter((id) => id !== fileId))
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const resetAll = () => {
    setFiles([])
    setSelectedIds([])
    setStatus('idle')
    setStatusMessage('')
    setDownloadUrl('')
    setResultName('')
  }

  return (
    <main className="tool-page" id={`tool-page-${toolId}`}>
      {/* Colored header bar */}
      <div className="tool-page__header" style={{ backgroundColor: tool.color }}>
        <div className="tool-page__header-inner">
          <button className="tool-page__back" onClick={() => onNavigate(null)} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            All tools
          </button>
          <h1 className="tool-page__title">{tool.title}</h1>
          <p className="tool-page__desc">{tool.description}</p>
        </div>
      </div>

      <div className="tool-page__body">
        <div className="tool-page__container">

          {/* Upload area - show when no files yet or done, except for html-to-pdf */}
          {status !== 'done' && toolId !== 'html-to-pdf' && (
            <div
              className={`upload-zone ${isDragging ? 'upload-zone--active' : ''} ${files.length > 0 ? 'upload-zone--compact' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              id="upload-zone"
            >
              {files.length === 0 ? (
                <>
                  <div className="upload-zone__icon" style={{ backgroundColor: tool.colorLight }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={tool.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <button
                    className="upload-zone__button"
                    style={{ backgroundColor: tool.color }}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    Select PDF files
                  </button>
                  <p className="upload-zone__hint">
                    {['jpg-to-pdf', 'scan-to-pdf'].includes(toolId) ? 'or drop image files here' : 'or drop PDF files here'}
                  </p>
                </>
              ) : (
                <button
                  className="upload-zone__add"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add more files
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  ['jpg-to-pdf', 'scan-to-pdf'].includes(toolId) ? 'image/jpeg,image/png' :
                  ['word-to-pdf'].includes(toolId) ? '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                  ['excel-to-pdf'].includes(toolId) ? '.xls,.xlsx,application/ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                  ['powerpoint-to-pdf'].includes(toolId) ? '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation' :
                  'application/pdf'
                }
                multiple={tool.multiFile}
                onChange={(e) => handleFileSelect(e.target.files)}
                style={{ display: 'none' }}
                id="file-input"
              />
            </div>
          )}

          {/* File list */}
          {files.length > 0 && status !== 'done' && (
            <div className="file-list" id="file-list">
              {files.map((file, index) => (
                <div className="file-item" key={index}>
                  <div className="file-item__icon" style={{ backgroundColor: tool.colorLight }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={tool.color}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8" fill="none" stroke={tool.color} strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="file-item__info">
                    <span className="file-item__name">{file.name}</span>
                    <span className="file-item__size">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    className="file-item__remove"
                    onClick={() => removeFile(index)}
                    type="button"
                    aria-label="Remove file"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tool options */}
          {(files.length > 0 || toolId === 'html-to-pdf') && tool.options && status !== 'done' && (
            <div className="tool-options" id="tool-options">
              <label className="tool-options__label">
                <span>{tool.options.label}</span>
                {tool.options.type === 'select' ? (
                  <select
                    className="tool-options__select"
                    value={getCurrentOptionValue()}
                    onChange={(e) => setOptionValue(e.target.value)}
                    id="tool-option-select"
                  >
                    {tool.options.selectOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt} deg</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="tool-options__input"
                    type={tool.options.type === 'password' ? 'password' : 'text'}
                    value={getCurrentOptionValue()}
                    onChange={(e) => setOptionValue(e.target.value)}
                    placeholder={tool.options.placeholder}
                    id="tool-option-input"
                  />
                )}
              </label>
            </div>
          )}

          {/* Process button */}
          {(files.length > 0 || toolId === 'html-to-pdf') && status !== 'done' && (
            <button
              className="process-btn"
              style={{ backgroundColor: tool.color }}
              onClick={handleProcess}
              disabled={status === 'uploading' || status === 'processing'}
              type="button"
              id="process-btn"
            >
              {status === 'uploading' && (
                <span className="process-btn__spinner" />
              )}
              {status === 'processing' && (
                <span className="process-btn__spinner" />
              )}
              {status === 'uploading' ? 'Uploading...'
                : status === 'processing' ? 'Processing...'
                : `${tool.title} ->`}
            </button>
          )}

          {/* Status message */}
          {statusMessage && status === 'error' && (
            <div className="status-bar status-bar--error" id="status-message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {statusMessage}
            </div>
          )}

          {/* Download section */}
          {status === 'done' && (
            <div className="download-section" id="download-section">
              <div className="download-section__icon" style={{ backgroundColor: tool.colorLight }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={tool.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h2 className="download-section__title">{tool.title} completed!</h2>
              <p className="download-section__name">{resultName || 'Your file is ready'}</p>

              {downloadUrl && (
                <a
                  className="download-btn"
                  href={downloadUrl}
                  download
                  style={{ backgroundColor: tool.color }}
                  id="download-btn"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {toolId.includes('pdf-to-') ? `Download ${toolId.split('-to-')[1].toUpperCase()}` : 'Download PDF'}
                </a>
              )}

              <button className="download-section__restart" onClick={resetAll} type="button">
                Process another file
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
