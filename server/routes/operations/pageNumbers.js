import File from '../../models/File.js'
import { createOutputFile, embedStandardFont, loadPdf } from '../pdfHelpers.js'
import { rgb } from 'pdf-lib'

const pageNumbersHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) {
      return res.status(404).json({ message: 'PDF file not found.' })
    }

    const sourceDoc = await loadPdf(file.path)
    const font = await embedStandardFont(sourceDoc)
    sourceDoc.getPages().forEach((page, index) => {
      const { width } = page.getSize()
      page.drawText(String(index + 1), {
        x: width - 60,
        y: 28,
        size: 12,
        font,
        color: rgb(0.33, 0.37, 0.41),
      })
    })

    const bytes = await sourceDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'paged')
    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Page numbering failed.', error: error.message })
  }
}

export default pageNumbersHandler
