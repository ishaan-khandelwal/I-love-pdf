import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import { execFile } from 'child_process'
import File from '../../models/File.js'
import { createOutputFile, uploadDir } from '../pdfHelpers.js'

const execFileAsync = promisify(execFile)

// Uses pdftoppm + tesseract if available
const ocrPdfHandler = async (req, res) => {
  try {
    const { fileId, lang } = req.body
    const file = await File.findById(fileId)
    if (!file) return res.status(404).json({ message: 'PDF file not found.' })

    const tempDir = path.join(uploadDir, 'tmp')
    await fs.mkdir(tempDir, { recursive: true })
    const base = path.join(tempDir, `ocr-${Date.now()}`)

    try {
      await execFileAsync('pdftoppm', ['-jpeg', '-f', '1', '-singlefile', file.path, base], { timeout: 120000 })
    } catch (err) {
      if (err.code === 'ENOENT') return res.status(500).json({ message: 'pdftoppm is required for OCR (poppler-utils).' })
      throw err
    }

    const imgPath = `${base}.jpg`
    const txtOut = `${base}.txt`
    try {
      await execFileAsync('tesseract', [imgPath, base, '-l', lang || 'eng'], { timeout: 120000 })
    } catch (err) {
      if (err.code === 'ENOENT') return res.status(500).json({ message: 'Tesseract is required for OCR. Install tesseract and ensure it is in PATH.' })
      throw err
    }

    const text = await fs.readFile(txtOut, 'utf8')
    const saved = await createOutputFile(Buffer.from(text), 'ocr-pdf', {
      extension: 'txt',
      contentType: 'text/plain',
    })
    saved.originalName = file.originalName.replace(/\.pdf$/i, '.txt')
    await saved.save()

    // cleanup
    await fs.rm(imgPath, { force: true })
    await fs.rm(txtOut, { force: true })

    res.json({ file: saved, text: text.slice(0, 1000) })
  } catch (error) {
    res.status(500).json({ message: 'OCR PDF failed.', error: error.message })
  }
}

export default ocrPdfHandler
