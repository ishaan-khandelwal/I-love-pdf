import fs from 'fs/promises'
import mammoth from 'mammoth'
import File from '../../models/File.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { PDFDocument, rgb } from 'pdf-lib'
import { createOutputFile, embedStandardFont } from '../pdfHelpers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const normalizeForPdf = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2022\u25CF\u25E6]/g, '-')
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim()

const wrapText = (text, width, font, fontSize) => {
  const words = text.split(/\s+/)
  const lines = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = font.widthOfTextAtSize(testLine, fontSize)
    if (testWidth > width) {
      if (currentLine) {
        lines.push(currentLine)
      }
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

const wordToPdfHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) return res.status(404).json({ message: 'Word document not found.' })

    const fileBuffer = await fs.readFile(file.path)
    
    // Extract raw text using mammoth
    const { value: text } = await mammoth.extractRawText({ buffer: fileBuffer })

    const paragraphs = text.split('\n').map(p => p.trim()).filter(Boolean)

    const pdfDoc = await PDFDocument.create()
    const font = await embedStandardFont(pdfDoc)

    let page = pdfDoc.addPage([595, 842]) // A4 Size
    let y = 800
    const margin = 50
    const printableWidth = 595 - margin * 2

    for (const para of paragraphs) {
      const fontSize = 11
      const normalizedPara = normalizeForPdf(para)
      const wrappedLines = wrapText(normalizedPara, printableWidth, font, fontSize)

      for (const line of wrappedLines) {
        if (y < 60) {
          page = pdfDoc.addPage([595, 842])
          y = 800
        }
        page.drawText(line, {
          x: margin,
          y: y,
          size: fontSize,
          font: font,
          color: rgb(0.1, 0.1, 0.1),
        })
        y -= fontSize + 6
      }
      y -= 10 // gap between paragraphs
    }

    if (paragraphs.length === 0) {
        page.drawText('No text found in the Word document.', { x: margin, y, size: 12, font })
    }

    const bytes = await pdfDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'word-to-pdf')
    
    // update original name
    saved.originalName = file.originalName.replace(/\.docx?$/i, '.pdf')
    await saved.save()

    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Word to PDF failed.', error: error.message })
  }
}

export default wordToPdfHandler
