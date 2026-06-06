import fs from 'fs/promises'
import File from '../../models/File.js'
import { PDFDocument } from 'pdf-lib'
import { createOutputFile } from '../pdfHelpers.js'

// If body.fill is provided (object), fill form fields; otherwise return field names
const pdfFormsHandler = async (req, res) => {
  try {
    const { fileId, fill } = req.body
    const file = await File.findById(fileId)
    if (!file) return res.status(404).json({ message: 'PDF file not found.' })

    const bytes = await fs.readFile(file.path)
    const pdfDoc = await PDFDocument.load(bytes)
    const form = pdfDoc.getForm()
    const fields = form.getFields().map(f => ({ name: f.getName() }))

    if (!fill) {
      return res.json({ fields })
    }

    // Fill provided fields
    for (const [key, value] of Object.entries(fill)) {
      try {
        const field = form.getTextField(key)
        field.setText(String(value))
      } catch {
        // ignore if field type mismatches; try button/checkbox
        try {
          const btn = form.getButton(key)
          if (btn && typeof btn.check === 'function') btn.check()
        } catch {
          console.warn('Could not set form field', key)
        }
      }
    }

    form.flatten()
    const outBytes = await pdfDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(outBytes, 'pdf-forms')
    saved.originalName = file.originalName
    await saved.save()

    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'PDF forms operation failed.', error: error.message })
  }
}

export default pdfFormsHandler
