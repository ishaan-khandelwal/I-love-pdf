import fs from 'fs/promises'
import pptxgen from 'pptxgenjs'
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

const pdfToPptHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) return res.status(404).json({ message: 'PDF file not found.' })

    const fileBuffer = await fs.readFile(file.path)
    const pages = await extractPdfText(fileBuffer)

    const pptx = new pptxgen()

    for (const page of pages) {
      const slide = pptx.addSlide()
      
      const cleanText = page.replace(/\s{3,}/g, '\n\n').trim()
      
      slide.addText(cleanText || 'No text extracted on this page.', {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: '90%',
        fontSize: 14,
        align: 'left',
        valign: 'top',
        wrap: true,
      })
    }

    if (pages.length === 0) {
        const slide = pptx.addSlide()
        slide.addText('No text could be extracted from this PDF.', { x: 0.5, y: 0.5, fontSize: 18 })
    }

    const outputFilename = `${crypto.randomUUID()}-powerpoint.pptx`
    const outputDir = path.join(__dirname, '..', '..', '..', 'uploads', 'processed')
    await fs.mkdir(outputDir, { recursive: true })
    const outputPath = path.join(outputDir, outputFilename)
    
    // pptxgenjs write method returns a promise when writeType is nodebuffer
    const buffer = await pptx.write({ outputType: 'nodebuffer' })
    await fs.writeFile(outputPath, buffer)
    
    const savedFile = await File.create({
      originalName: file.originalName.replace(/\.pdf$/i, '.pptx'),
      path: outputPath,
      size: buffer.length,
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })

    res.json({ file: savedFile })
  } catch (error) {
    res.status(500).json({ message: 'PDF to PowerPoint failed.', error: error.message })
  }
}

export default pdfToPptHandler
