import { PDFDocument } from 'pdf-lib'
import fs from 'fs/promises'
import path from 'path'

const API_BASE = 'http://localhost:5000/api/pdf'

async function runVerification() {
  console.log('--- PHASE 2 VERIFICATION ---')
  
  try {
    // ─── Test 1: HTML to PDF ──────────────────────────────────
    console.log('\n[1/3] Testing HTML to PDF...')
    const htmlRes = await fetch(`${API_BASE}/html-to-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ htmlContent: '<h1>Hello World</h1><p>This is a test paragraph from the verification script.</p>' })
    })
    const htmlData = await htmlRes.json()
    if (!htmlRes.ok) throw new Error(`HTML to PDF FAILED: ${htmlData.message}`)
    
    const htmlPdfId = htmlData.file._id
    const htmlDownload = await fetch(`${API_BASE}/download/${htmlPdfId}`)
    const htmlBytes = Buffer.from(await htmlDownload.arrayBuffer())
    const htmlDoc = await PDFDocument.load(htmlBytes)
    console.log(`✓ HTML to PDF - Page count: ${htmlDoc.getPageCount()}, Size: ${htmlBytes.length} bytes`)
    
    // ─── Test 2: AI Summarizer ────────────────────────────────
    console.log('\n[2/3] Testing AI Summarizer...')
    
    // Create a simple PDF with text
    const textPdf = await PDFDocument.create()
    const page = textPdf.addPage([595, 842])
    page.drawText([
      'Introduction to Machine Learning',
      'Machine learning is a branch of artificial intelligence that enables computers',
      'to learn from data without being explicitly programmed. Deep learning models',
      'use neural networks to process information. Training these models requires',
      'large datasets and significant computational resources. Applications include',
      'image recognition, natural language processing, and recommendation systems.',
      'The field continues to evolve with new architectures and training techniques.',
    ].join(' '), { x: 50, y: 750, size: 12 })
    
    const textPdfBytes = await textPdf.save()
    const dummyPath = path.resolve('dummy-ai-test.pdf')
    await fs.writeFile(dummyPath, textPdfBytes)
    
    const uploadRes = await uploadFile(dummyPath, 'test.pdf', 'application/pdf')
    const pdfFileId = uploadRes.files[0]._id
    
    const aiRes = await fetch(`${API_BASE}/ai-summarizer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: pdfFileId })
    })
    const aiData = await aiRes.json()
    if (!aiRes.ok) throw new Error(`AI Summarizer FAILED: ${aiData.message}`)
    
    const aiPdfId = aiData.file._id
    const aiDownload = await fetch(`${API_BASE}/download/${aiPdfId}`)
    const aiBytes = Buffer.from(await aiDownload.arrayBuffer())
    const aiDoc = await PDFDocument.load(aiBytes)
    console.log(`✓ AI Summarizer - Page count: ${aiDoc.getPageCount()}, Size: ${aiBytes.length} bytes`)
    await fs.unlink(dummyPath).catch(() => {})
    
    // ─── Test 3: Scan to PDF ──────────────────────────────────
    console.log('\n[3/3] Testing Scan to PDF (image → PDF)...')
    const imagePath = path.resolve('src/assets/hero.png')
    const imageUpload = await uploadFile(imagePath, 'scan.png', 'image/png')
    const imgFileId = imageUpload.files[0]._id
    
    const scanRes = await fetch(`${API_BASE}/scan-to-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds: [imgFileId] })
    })
    const scanData = await scanRes.json()
    if (!scanRes.ok) throw new Error(`Scan to PDF FAILED: ${scanData.message}`)
    
    const scanPdfId = scanData.file._id
    const scanDownload = await fetch(`${API_BASE}/download/${scanPdfId}`)
    const scanBytes = Buffer.from(await scanDownload.arrayBuffer())
    const scanDoc = await PDFDocument.load(scanBytes)
    console.log(`✓ Scan to PDF - Page count: ${scanDoc.getPageCount()}, Size: ${scanBytes.length} bytes`)
    
    console.log('\n--- ALL PHASE 2 VERIFICATIONS PASSED! ---')
  } catch (err) {
    console.error('\nVERIFICATION FAILED:', err.message)
    process.exit(1)
  }
}

async function uploadFile(filePath, fileName, mimeType) {
  const fileBuffer = await fs.readFile(filePath)
  const boundary = `----Boundary${Math.random().toString(36).substring(2)}`
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  const footer = `\r\n--${boundary}--\r\n`
  const payload = Buffer.concat([Buffer.from(header), fileBuffer, Buffer.from(footer)])
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: payload
  })
  return res.json()
}

runVerification()
