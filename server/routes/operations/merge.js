import { PDFDocument } from 'pdf-lib'
import File from '../../models/File.js'
import { createOutputFile, loadPdf } from '../pdfHelpers.js'

const mergeHandler = async (req, res) => {
  try {
    const { fileIds } = req.body
    if (!Array.isArray(fileIds) || fileIds.length < 2) {
      return res.status(400).json({ message: 'Select at least two PDF files to merge.' })
    }

    const files = await File.find({ _id: { $in: fileIds } })
    if (files.length !== fileIds.length) {
      return res.status(404).json({ message: 'One or more selected files were not found.' })
    }

    const ordered = fileIds.map((id) => files.find((file) => file._id.toString() === id))
    const mergedDoc = await PDFDocument.create()

    for (const file of ordered) {
      const sourceDoc = await loadPdf(file.path)
      const copiedPages = await mergedDoc.copyPages(sourceDoc, sourceDoc.getPageIndices())
      copiedPages.forEach((page) => mergedDoc.addPage(page))
    }

    const bytes = await mergedDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'merged')
    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Merge failed.', error: error.message })
  }
}

export default mergeHandler
