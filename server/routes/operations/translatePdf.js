import fs from 'fs/promises'
import { PDFParse } from 'pdf-parse'
import File from '../../models/File.js'
import { createOutputFile } from '../pdfHelpers.js'

// Simple placeholder: extracts text and returns it; requires external translation service to actually translate
const translatePdfHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) return res.status(404).json({ message: 'PDF file not found.' })

    const data = await fs.readFile(file.path)
    const parser = new PDFParse({ data })
    const parsed = await parser.getText()
    const text = parsed.text || ''

    // No translation service configured here; return extracted text and a note
    const saved = await createOutputFile(Buffer.from(text), 'pdf-extracted-text', {
      extension: 'txt',
      contentType: 'text/plain',
    })
    saved.originalName = file.originalName.replace(/\.pdf$/i, '.txt')
    await saved.save()

    res.json({ message: 'Text extracted. Provide a translation service to translate text programmatically.', file: saved, snippet: text.slice(0, 1000) })
  } catch (error) {
    res.status(500).json({ message: 'Translate PDF failed.', error: error.message })
  }
}

export default translatePdfHandler
