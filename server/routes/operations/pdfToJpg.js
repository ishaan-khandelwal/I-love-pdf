import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import { execFile } from 'child_process'
import File from '../../models/File.js'
import { createOutputFile, uploadDir } from '../pdfHelpers.js'

const execFileAsync = promisify(execFile)

const pdfToJpgHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) return res.status(404).json({ message: 'PDF file not found.' })

    const tempDir = path.join(uploadDir, 'tmp')
    await fs.mkdir(tempDir, { recursive: true })
    const outPrefix = path.join(tempDir, `page-${Date.now()}`)

    // Use pdftoppm (poppler) if available
    try {
      await execFileAsync('pdftoppm', ['-jpeg', '-f', '1', '-singlefile', file.path, outPrefix], { timeout: 120000 })
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(500).json({ message: 'pdftoppm (poppler) is required to convert PDF to JPG. Install poppler-utils and ensure pdftoppm is in PATH.' })
      }
      throw err
    }

    const jpgPath = `${outPrefix}.jpg`
    const jpgBytes = await fs.readFile(jpgPath)
    const saved = await createOutputFile(jpgBytes, 'pdf-to-jpg', {
      extension: 'jpg',
      contentType: 'image/jpeg',
    })
    saved.originalName = file.originalName.replace(/\.pdf$/i, '.jpg')
    await saved.save()

    // cleanup
    await fs.rm(jpgPath, { force: true })

    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'PDF to JPG failed.', error: error.message })
  }
}

export default pdfToJpgHandler
