import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import { execFile } from 'child_process'
import File from '../../models/File.js'
import { createOutputFile, uploadDir } from '../pdfHelpers.js'

const execFileAsync = promisify(execFile)

const pdfToPdfAHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) return res.status(404).json({ message: 'PDF file not found.' })

    const tempDir = path.join(uploadDir, 'tmp')
    await fs.mkdir(tempDir, { recursive: true })
    const outPath = path.join(tempDir, `${path.basename(file.path, '.pdf')}-pdfa.pdf`)

    try {
      // Ghostscript command to convert to PDF/A (may vary by Ghostscript version)
      await execFileAsync('gs', ['-dPDFA=2', '-dBATCH', '-dNOPAUSE', '-sProcessColorModel=DeviceRGB', '-sDEVICE=pdfwrite', `-sOutputFile=${outPath}`, file.path], { timeout: 120000 })
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(500).json({ message: 'Ghostscript (gs) is required to convert PDF to PDF/A. Install ghostscript and ensure `gs` is in PATH.' })
      }
      throw err
    }

    const outBytes = await fs.readFile(outPath)
    const saved = await createOutputFile(outBytes, 'pdf-to-pdfa')
    saved.originalName = file.originalName
    await saved.save()
    await fs.rm(outPath, { force: true })

    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'PDF to PDF/A failed.', error: error.message })
  }
}

export default pdfToPdfAHandler
