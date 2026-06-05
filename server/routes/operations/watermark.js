import File from '../../models/File.js'
import { createOutputFile, embedStandardFont, loadPdf, watermarkSettings } from '../pdfHelpers.js'

const watermarkHandler = async (req, res) => {
  try {
    const { fileId, watermarkText } = req.body
    const file = await File.findById(fileId)
    if (!file) {
      return res.status(404).json({ message: 'PDF file not found.' })
    }

    const sourceDoc = await loadPdf(file.path)
    const font = await embedStandardFont(sourceDoc)
    sourceDoc.getPages().forEach((page) => watermarkSettings(page, watermarkText, font))

    const bytes = await sourceDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'watermarked')
    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Watermark failed.', error: error.message })
  }
}

export default watermarkHandler
