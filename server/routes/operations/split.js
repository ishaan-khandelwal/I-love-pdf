import { PDFDocument } from 'pdf-lib'
import File from '../../models/File.js'
import { createOutputFile, loadPdf, parsePageRange } from '../pdfHelpers.js'

const splitHandler = async (req, res) => {
  try {
    const { fileId, pageRange } = req.body
    const file = await File.findById(fileId)
    if (!file) {
      return res.status(404).json({ message: 'PDF file not found.' })
    }

    const sourceDoc = await loadPdf(file.path)
    const pages = parsePageRange(pageRange || '1', sourceDoc.getPageCount())
    if (!pages.length) {
      return res.status(400).json({ message: 'Enter a valid page range like 1-3 or 1,4,5.' })
    }

    const splitDoc = await PDFDocument.create()
    const copiedPages = await splitDoc.copyPages(sourceDoc, pages)
    copiedPages.forEach((page) => splitDoc.addPage(page))

    const bytes = await splitDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'split')
    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Split failed.', error: error.message })
  }
}

export default splitHandler
