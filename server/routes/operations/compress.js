import File from '../../models/File.js'
import { createOutputFile, loadPdf } from '../pdfHelpers.js'

const compressHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) {
      return res.status(404).json({ message: 'PDF file not found.' })
    }

    const sourceDoc = await loadPdf(file.path)
    const bytes = await sourceDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'compressed')
    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Compress failed.', error: error.message })
  }
}

export default compressHandler
