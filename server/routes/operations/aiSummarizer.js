import { PDFDocument, rgb } from 'pdf-lib'
import fs from 'fs/promises'
import File from '../../models/File.js'
import { createOutputFile, embedStandardFont } from '../pdfHelpers.js'

const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

// Simple stop words list to filter out key terms
const STOP_WORDS = new Set([
  'the', 'and', 'a', 'to', 'of', 'in', 'i', 'is', 'that', 'it', 'on', 'you', 'this', 'for', 'but', 
  'with', 'as', 'are', 'was', 'with', 'they', 'at', 'be', 'or', 'an', 'have', 'from', 'by', 'not', 
  'your', 'we', 'he', 'she', 'his', 'her', 'their', 'them', 'can', 'will', 'would', 'there', 'their'
])

const normalizeForPdf = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2022\u25CF\u25E6]/g, '-')
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const extractKeyTerms = (text) => {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOP_WORDS.has(w))

  const freq = {}
  words.forEach((w) => {
    freq[w] = (freq[w] || 0) + 1
  })

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((entry) => `${entry[0]} (${entry[1]}x)`)
}

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

  return {
    pageCount: document.numPages,
    text: normalizeForPdf(pages.join('\n\n')),
  }
}

const splitSentences = (text) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30)

const buildExtractiveSummary = (text, keyTerms) => {
  const sentences = splitSentences(text)
  if (!sentences.length) {
    return text.split(/\s+/).slice(0, 90).join(' ')
  }

  const terms = keyTerms.map((term) => term.split(' ')[0])
  const scored = sentences.map((sentence, index) => {
    const lower = sentence.toLowerCase()
    const termScore = terms.reduce((score, term) => score + (lower.includes(term) ? 2 : 0), 0)
    const positionScore = index < 5 ? 3 : index > sentences.length - 4 ? 1 : 0
    return { sentence, index, score: termScore + positionScore }
  })

  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 6)
    .sort((a, b) => a.index - b.index)
    .map(({ sentence }) => sentence)
    .join(' ')
}

const wrapText = (text, width, font, fontSize) => {
  const words = normalizeForPdf(text).split(/\s+/).filter(Boolean)
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

const drawWrappedText = (pdfDoc, state, text, options = {}) => {
  const {
    x = state.margin,
    width = state.printableWidth,
    size = 10,
    font = state.font,
    color = rgb(0.2, 0.2, 0.2),
    lineHeight = 14,
  } = options

  const lines = wrapText(text, width, font, size)
  for (const line of lines) {
    if (state.y < state.margin + lineHeight) {
      state.page = pdfDoc.addPage([595, 842])
      state.y = 792
    }
    state.page.drawText(normalizeForPdf(line), { x, y: state.y, size, font, color })
    state.y -= lineHeight
  }
}

const drawHeading = (pdfDoc, state, text) => {
  if (state.y < 90) {
    state.page = pdfDoc.addPage([595, 842])
    state.y = 792
  }
  state.page.drawText(normalizeForPdf(text), {
    x: state.margin,
    y: state.y,
    size: 12,
    font: state.fontBold,
    color: rgb(0.12, 0.12, 0.15),
  })
  state.y -= 18
}

const aiSummarizerHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) {
      return res.status(404).json({ message: 'PDF file not found.' })
    }

    const fileBuffer = await fs.readFile(file.path)
    const pdfData = await extractPdfText(fileBuffer)
    const extractedText = pdfData.text || ''

    if (!extractedText) {
      return res.status(400).json({
        message: 'No selectable text was found in this PDF. Scanned/image-only PDFs need OCR before summarizing.',
      })
    }

    // Document statistics
    const wordCount = extractedText.split(/\s+/).filter(Boolean).length
    const pageCount = pdfData.pageCount || 1
    const charCount = extractedText.length
    
    // Key terms extraction
    const keyTerms = extractKeyTerms(extractedText)

    // Document segments
    const words = extractedText.split(/\s+/).filter(Boolean)
    const overview = buildExtractiveSummary(extractedText, keyTerms)
    const keyTakeaways = words.length > 80
      ? words.slice(-160).join(' ')
      : 'The document is short, so the main overview also covers the key takeaways.'

    // Generate output PDF
    const pdfDoc = await PDFDocument.create()
    const font = await embedStandardFont(pdfDoc)
    const fontBold = await pdfDoc.embedFont('Helvetica-Bold')

    const margin = 50
    const printableWidth = 595 - margin * 2
    const state = {
      page: pdfDoc.addPage([595, 842]), // A4
      margin,
      printableWidth,
      y: 800,
      font,
      fontBold,
    }

    // Header
    state.page.drawText('AI DOCUMENT SUMMARY REPORT', {
      x: margin,
      y: state.y,
      size: 18,
      font: fontBold,
      color: rgb(0.18, 0.64, 0.61),
    })
    state.y -= 12

    // Divider line
    state.page.drawLine({
      start: { x: margin, y: state.y },
      end: { x: 595 - margin, y: state.y },
      thickness: 2,
      color: rgb(0.18, 0.64, 0.61),
    })
    state.y -= 25

    // Document Meta Table
    drawHeading(pdfDoc, state, 'File Information:')
    drawWrappedText(pdfDoc, state, `Original Name: ${normalizeForPdf(file.originalName)}`, { x: margin + 15, width: printableWidth - 15 })
    drawWrappedText(pdfDoc, state, `Size: ${(file.size / 1024).toFixed(1)} KB`, { x: margin + 15, width: printableWidth - 15 })
    state.y -= 15

    // Document Statistics Box
    drawHeading(pdfDoc, state, 'Analysis Statistics:')
    drawWrappedText(pdfDoc, state, `- Total Pages: ${pageCount}`, { x: margin + 15, width: printableWidth - 15 })
    drawWrappedText(pdfDoc, state, `- Total Words: ${wordCount}`, { x: margin + 15, width: printableWidth - 15 })
    drawWrappedText(pdfDoc, state, `- Total Characters: ${charCount}`, { x: margin + 15, width: printableWidth - 15 })
    state.y -= 15

    // Key Terms Section
    drawHeading(pdfDoc, state, 'Key Terms / Frequent Keywords:')
    if (keyTerms.length === 0) {
      drawWrappedText(pdfDoc, state, 'None detected.', { x: margin + 15, width: printableWidth - 15 })
    } else {
      drawWrappedText(pdfDoc, state, keyTerms.join(', '), { x: margin + 15, width: printableWidth - 15 })
    }
    state.y -= 15

    // Overview Section
    drawHeading(pdfDoc, state, 'Abstract & Document Overview:')
    drawWrappedText(pdfDoc, state, overview, { x: margin + 15, width: printableWidth - 15 })
    state.y -= 15

    // Conclusions Section
    drawHeading(pdfDoc, state, 'Conclusions / Key Takeaways:')
    drawWrappedText(pdfDoc, state, keyTakeaways, { x: margin + 15, width: printableWidth - 15 })

    const bytes = await pdfDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'summary')
    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Summary generation failed.', error: error.message })
  }
}

export default aiSummarizerHandler
