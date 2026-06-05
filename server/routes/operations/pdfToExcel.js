import fs from 'fs/promises'
import xlsx from 'xlsx'
import File from '../../models/File.js'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

const extractPdfText = async (fileBuffer) => {
  const document = await pdfjsLib.getDocument({
    data: new Uint8Array(fileBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise

  const pages = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => item.str).join(' '))
  }
  return pages
}

const pdfToExcelHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) return res.status(404).json({ message: 'PDF file not found.' })

    const fileBuffer = await fs.readFile(file.path)
    const pages = await extractPdfText(fileBuffer)

    const wsData = []
    for (const page of pages) {
      // Very basic heuristic: split by newlines or large spaces to form columns
      const lines = page.replace(/\s{4,}/g, '\n').split('\n')
      for (const line of lines) {
        if (line.trim()) {
          // split by smaller spaces or tab approximations for columns
          const cols = line.split(/\s{2,}/).map(c => c.trim()).filter(Boolean)
          if (cols.length > 0) {
              wsData.push(cols)
          }
        }
      }
      wsData.push([]) // empty row for page break
    }

    if (wsData.length === 0) {
        wsData.push(['No table data could be extracted from this PDF.'])
    }

    const wb = xlsx.utils.book_new()
    const ws = xlsx.utils.aoa_to_sheet(wsData)
    xlsx.utils.book_append_sheet(wb, ws, 'Data')

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const outputFilename = `${crypto.randomUUID()}-excel.xlsx`
    const outputDir = path.join(__dirname, '..', '..', '..', 'uploads', 'processed')
    await fs.mkdir(outputDir, { recursive: true })
    const outputPath = path.join(outputDir, outputFilename)
    
    await fs.writeFile(outputPath, buffer)
    
    const savedFile = await File.create({
      originalName: file.originalName.replace(/\.pdf$/i, '.xlsx'),
      path: outputPath,
      size: buffer.length,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    res.json({ file: savedFile })
  } catch (error) {
    res.status(500).json({ message: 'PDF to Excel failed.', error: error.message })
  }
}

export default pdfToExcelHandler
