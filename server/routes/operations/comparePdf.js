import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import { execFile } from 'child_process'
import File from '../../models/File.js'
import { createOutputFile, uploadDir } from '../pdfHelpers.js'

const execFileAsync = promisify(execFile)

// Uses diff-pdf (or similar) to produce visual diff if available
const comparePdfHandler = async (req, res) => {
  try {
    const { fileAId, fileBId, fileIds } = req.body
    const [firstId, secondId] = fileIds && fileIds.length >= 2 ? fileIds : [fileAId, fileBId]
    const fileA = await File.findById(firstId)
    const fileB = await File.findById(secondId)
    if (!fileA || !fileB) return res.status(404).json({ message: 'Please provide two PDF files to compare.' })

    const tempDir = path.join(uploadDir, 'tmp')
    await fs.mkdir(tempDir, { recursive: true })
    const outPath = path.join(tempDir, `diff-${Date.now()}.png`)

    try {
      // diff-pdf --output-diff=out.png a.pdf b.pdf
      await execFileAsync('diff-pdf', ['--output-diff=' + outPath, fileA.path, fileB.path], { timeout: 120000 })
    } catch (err) {
      if (err.code === 'ENOENT') return res.status(500).json({ message: 'diff-pdf is required to compare PDFs. Install diff-pdf and ensure it is in PATH.' })
      // diff-pdf returns non-zero exit code when differences are found; proceed if outPath exists
    }

    const exists = await fs.stat(outPath).then(() => true).catch(() => false)
    if (!exists) return res.status(200).json({ message: 'No visual diff generated (files may be identical or diff-pdf returned non-zero without output).' })

    const bytes = await fs.readFile(outPath)
    const saved = await createOutputFile(bytes, 'compare-pdf', { extension: 'png', contentType: 'image/png' })
    saved.originalName = 'diff.png'
    await saved.save()
    await fs.rm(outPath, { force: true })

    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Compare PDF failed.', error: error.message })
  }
}

export default comparePdfHandler
