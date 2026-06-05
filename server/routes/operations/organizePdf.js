import { PDFDocument } from 'pdf-lib'
import File from '../../models/File.js'
import { createOutputFile, loadPdf } from '../pdfHelpers.js'

const parsePageOrder = (orderStr, pageCount) => {
  const pages = []
  orderStr.split(',').forEach((part) => {
    const trimmed = part.trim()
    if (!trimmed) return
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-')
      const start = Number(startStr)
      const end = Number(endStr)
      if (Number.isNaN(start) || Number.isNaN(end)) return
      if (start <= end) {
        for (let i = Math.max(1, start); i <= Math.min(end, pageCount); i += 1) {
          pages.push(i - 1)
        }
      } else {
        for (let i = Math.min(start, pageCount); i >= Math.max(1, end); i -= 1) {
          pages.push(i - 1)
        }
      }
    } else {
      const page = Number(trimmed)
      if (!Number.isNaN(page) && page >= 1 && page <= pageCount) {
        pages.push(page - 1)
      }
    }
  })
  return pages
}

const organizePdfHandler = async (req, res) => {
  try {
    const { fileId, pageOrder } = req.body
    if (!pageOrder) {
      return res.status(400).json({ message: 'Page order is required.' })
    }

    const file = await File.findById(fileId)
    if (!file) {
      return res.status(404).json({ message: 'PDF file not found.' })
    }

    const sourceDoc = await loadPdf(file.path)
    const pages = parsePageOrder(pageOrder, sourceDoc.getPageCount())
    if (!pages.length) {
      return res.status(400).json({ message: 'Enter a valid page order (e.g. 2,1,3 or 1-3).' })
    }

    const organizeDoc = await PDFDocument.create()
    const copiedPages = await organizeDoc.copyPages(sourceDoc, pages)
    copiedPages.forEach((page) => organizeDoc.addPage(page))

    const bytes = await organizeDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'organized')
    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Organize failed.', error: error.message })
  }
}

export default organizePdfHandler
