import File from '../../models/File.js'
import { createOutputFile, loadPdf } from '../pdfHelpers.js'
import { degrees } from 'pdf-lib'

const rotateHandler = async (req, res) => {
  try {
    const { fileId, degrees: rotationDegrees } = req.body
    const file = await File.findById(fileId)
    if (!file) {
      return res.status(404).json({ message: 'PDF file not found.' })
    }

    const sourceDoc = await loadPdf(file.path)
    sourceDoc.getPages().forEach((page) => {
      page.setRotation(degrees(rotationDegrees || 90))
    })

    const bytes = await sourceDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'rotated')
    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Rotate failed.', error: error.message })
  }
}

export default rotateHandler
