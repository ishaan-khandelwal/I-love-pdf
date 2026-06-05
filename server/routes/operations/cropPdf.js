import File from '../../models/File.js'
import { createOutputFile, loadPdf, parseCropMargins } from '../pdfHelpers.js'

const cropPdfHandler = async (req, res) => {
  try {
    const { fileId, cropMargins } = req.body
    const file = await File.findById(fileId)
    if (!file) {
      return res.status(404).json({ message: 'PDF file not found.' })
    }

    const values = parseCropMargins(cropMargins)
    if (!values) {
      return res.status(400).json({ message: 'Enter crop values as top,right,bottom,left.' })
    }

    const { top, right, bottom, left } = values
    const sourceDoc = await loadPdf(file.path)
    sourceDoc.getPages().forEach((page) => {
      const { width, height } = page.getSize()
      page.setCropBox(left, bottom, width - left - right, height - bottom - top)
    })

    const bytes = await sourceDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'cropped')
    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Crop failed.', error: error.message })
  }
}

export default cropPdfHandler
