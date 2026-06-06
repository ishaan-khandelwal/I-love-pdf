import fs from 'fs/promises'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import File from '../../models/File.js'
import { createOutputFile } from '../pdfHelpers.js'

const signPdfHandler = async (req, res) => {
  try {
    const { fileId, signerName } = req.body
    const file = await File.findById(fileId)
    if (!file) return res.status(404).json({ message: 'PDF file not found.' })

    const bytes = await fs.readFile(file.path)
    const pdfDoc = await PDFDocument.load(bytes)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pages = pdfDoc.getPages()
    const signatureText = signerName ? `Signed by ${signerName}` : 'Signed document'

    pages.forEach((page) => {
      page.drawText(signatureText, {
        x: 40,
        y: 40,
        size: 12,
        font,
        color: rgb(0.1, 0.1, 0.6),
        opacity: 0.85,
      })
    })

    const outBytes = await pdfDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(outBytes, 'sign-pdf')
    saved.originalName = file.originalName
    await saved.save()

    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Sign PDF failed.', error: error.message })
  }
}

export default signPdfHandler
