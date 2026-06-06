import fs from 'fs/promises'
import File from '../../models/File.js'
import { PDFDocument, rgb } from 'pdf-lib'
import { createOutputFile } from '../pdfHelpers.js'

// Expects body: { fileId, redactions: [{ page:1, x, y, width, height }] }
const redactPdfHandler = async (req, res) => {
  try {
    const { fileId, redactions } = req.body
    const file = await File.findById(fileId)
    if (!file) return res.status(404).json({ message: 'PDF file not found.' })

    if (!Array.isArray(redactions) || !redactions.length) {
      return res.status(400).json({ message: 'Provide redactions array with page and rectangle coordinates.' })
    }

    const bytes = await fs.readFile(file.path)
    const pdfDoc = await PDFDocument.load(bytes)

    for (const r of redactions) {
      const pageIndex = Math.max(0, (r.page || 1) - 1)
      const page = pdfDoc.getPage(pageIndex)
      if (!page) continue
      const { x, y, width, height } = r
      page.drawRectangle({ x: x || 0, y: y || 0, width: width || 50, height: height || 20, color: rgb(0, 0, 0) })
    }

    const outBytes = await pdfDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(outBytes, 'redact-pdf')
    saved.originalName = file.originalName
    await saved.save()

    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Redact PDF failed.', error: error.message })
  }
}

export default redactPdfHandler
