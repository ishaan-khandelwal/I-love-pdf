import { PDFDocument } from 'pdf-lib'
import fs from 'fs/promises'
import File from '../../models/File.js'
import { createOutputFile } from '../pdfHelpers.js'

const jpgToPdfHandler = async (req, res) => {
  try {
    const { fileIds } = req.body
    if (!Array.isArray(fileIds) || fileIds.length < 1) {
      return res.status(400).json({ message: 'Select at least one image to convert.' })
    }

    const files = await File.find({ _id: { $in: fileIds } })
    if (files.length !== fileIds.length) {
      return res.status(404).json({ message: 'One or more selected files were not found.' })
    }

    // Keep the order of files as they were sent in request
    const ordered = fileIds.map((id) => files.find((file) => file._id.toString() === id))
    const pdfDoc = await PDFDocument.create()

    for (const file of ordered) {
      const imgBytes = await fs.readFile(file.path)
      let img
      
      if (file.contentType === 'image/png') {
        img = await pdfDoc.embedPng(imgBytes)
      } else if (file.contentType === 'image/jpeg' || file.contentType === 'image/jpg') {
        img = await pdfDoc.embedJpg(imgBytes)
      } else {
        return res.status(400).json({ message: `Unsupported file type: ${file.contentType}` })
      }

      const page = pdfDoc.addPage([img.width, img.height])
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      })
    }

    const bytes = await pdfDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'converted')
    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Image conversion failed.', error: error.message })
  }
}

export default jpgToPdfHandler
