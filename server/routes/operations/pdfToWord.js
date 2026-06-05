import fs from 'fs/promises'
import { Document, Packer, Paragraph, TextRun } from 'docx'
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
    // Join items with a space to form lines, then simple approximation
    pages.push(content.items.map((item) => item.str).join(' '))
  }
  return pages
}

const pdfToWordHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) return res.status(404).json({ message: 'PDF file not found.' })

    const fileBuffer = await fs.readFile(file.path)
    const pages = await extractPdfText(fileBuffer)

    const paragraphs = []
    for (const page of pages) {
      // Split page content into simple chunks to represent lines
      const parts = page.replace(/\s{3,}/g, '\n').split('\n')
      for (const part of parts) {
        if (part.trim()) {
          paragraphs.push(new Paragraph({
            children: [new TextRun(part.trim())],
            spacing: { after: 120 }
          }))
        }
      }
      // Empty paragraph between pages
      paragraphs.push(new Paragraph({ text: '' }))
    }

    if (paragraphs.length === 0) {
        paragraphs.push(new Paragraph({ text: 'No text could be extracted from this PDF.' }))
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    })

    const buffer = await Packer.toBuffer(doc)
    const outputFilename = `${crypto.randomUUID()}-word.docx`
    const outputDir = path.join(__dirname, '..', '..', '..', 'uploads', 'processed')
    await fs.mkdir(outputDir, { recursive: true })
    const outputPath = path.join(outputDir, outputFilename)
    
    await fs.writeFile(outputPath, buffer)
    
    const savedFile = await File.create({
      originalName: file.originalName.replace(/\.pdf$/i, '.docx'),
      path: outputPath,
      size: buffer.length,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    res.json({ file: savedFile })
  } catch (error) {
    res.status(500).json({ message: 'PDF to Word failed.', error: error.message })
  }
}

export default pdfToWordHandler
