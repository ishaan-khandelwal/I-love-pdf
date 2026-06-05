import fs from 'fs/promises'
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite'
import File from '../../models/File.js'
import { createOutputFile } from '../pdfHelpers.js'

const protectPdfHandler = async (req, res) => {
  try {
    const { fileId, password } = req.body
    if (!password) {
      return res.status(400).json({ message: 'Password is required.' })
    }

    const file = await File.findById(fileId)
    if (!file) {
      return res.status(404).json({ message: 'PDF file not found.' })
    }

    const sourceBytes = await fs.readFile(file.path)
    const bytes = await encryptPDF(new Uint8Array(sourceBytes), password, password)
    const saved = await createOutputFile(bytes, 'protected')
    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Protect failed.', error: error.message })
  }
}

export default protectPdfHandler
