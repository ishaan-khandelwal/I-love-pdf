import fs from 'fs/promises'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import JSZip from 'jszip'
import File from '../../models/File.js'
import { createOutputFile, embedStandardFont, uploadDir } from '../pdfHelpers.js'
import { PDFDocument, rgb } from 'pdf-lib'

const execFileAsync = promisify(execFile)

const supportedExtensions = new Set(['.pptx', '.ppt'])
const libreOfficeCandidates = process.platform === 'win32'
  ? ['soffice.exe', 'soffice']
  : ['soffice', 'libreoffice']

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
      if (currentLine) lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

const extractSlideText = (xml) => {
  const matches = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi)]
  return matches.map((match) => match[1].replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ').trim()
}

const parsePptxSlides = async (buffer) => {
  const zip = await JSZip.loadAsync(buffer)
  const slideFiles = Object.keys(zip.files)
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry))
    .sort((a, b) => Number(a.match(/slide(\d+)\.xml$/i)?.[1]) - Number(b.match(/slide(\d+)\.xml$/i)?.[1]))

  if (!slideFiles.length) {
    throw new Error('No slides found in PPTX file.')
  }

  const slides = []
  for (const slidePath of slideFiles) {
    const xml = await zip.files[slidePath].async('string')
    const text = extractSlideText(xml)
    slides.push(text || 'Slide contains no extractable text.')
  }
  return slides
}

const convertPptxToPdfInProcess = async (buffer) => {
  const pdfDoc = await PDFDocument.create()
  const font = await embedStandardFont(pdfDoc)
  const slides = await parsePptxSlides(buffer)

  const margin = 50
  const pageWidth = 595
  const pageHeight = 842
  const printableWidth = pageWidth - margin * 2
  const fontSize = 12

  for (let i = 0; i < slides.length; i += 1) {
    let page = pdfDoc.addPage([pageWidth, pageHeight])
    const slideText = `Slide ${i + 1}`
    page.drawText(slideText, { x: margin, y: pageHeight - margin, size: 16, font, color: rgb(0.1, 0.1, 0.1) })
    let y = pageHeight - margin - 32

    const lines = wrapText(normalizeForPdf(slides[i]), printableWidth, font, fontSize)
    if (!lines.length) {
      page.drawText('No visible slide text could be extracted.', { x: margin, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) })
      continue
    }

    for (const line of lines) {
      if (y < margin + fontSize) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) })
      y -= fontSize + 6
    }
  }

  return pdfDoc.save({ useObjectStreams: true, compress: true })
}

const convertPresentationToPdf = async (sourcePath, outputDir) => {
  const args = ['--headless', '--convert-to', 'pdf', '--outdir', outputDir, sourcePath]

  for (const command of libreOfficeCandidates) {
    try {
      await execFileAsync(command, args, { windowsHide: true, timeout: 120000 })
      return
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
  }

  throw new Error(
    `LibreOffice executable not found. Install LibreOffice and ensure one of ${libreOfficeCandidates.join(', ')} is available in PATH.`
  )
}

const powerpointToPdfHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) {
      return res.status(404).json({ message: 'PowerPoint file not found.' })
    }

    const extension = path.extname(file.path).toLowerCase()
    if (!supportedExtensions.has(extension)) {
      return res.status(400).json({ message: 'Unsupported file type. Please upload a PPT or PPTX file.' })
    }

    const fileBuffer = await fs.readFile(file.path)
    let pdfBytes

    if (extension === '.pptx') {
        try {
          pdfBytes = await convertPptxToPdfInProcess(fileBuffer)
        } catch {
          // If built-in fallback cannot parse the file, try LibreOffice as a second option
          const tempDir = path.join(uploadDir, 'tmp')
          await fs.mkdir(tempDir, { recursive: true })
          await convertPresentationToPdf(file.path, tempDir)
          const convertedPath = path.join(tempDir, `${path.basename(file.path, extension)}.pdf`)
          pdfBytes = await fs.readFile(convertedPath)
          await fs.rm(convertedPath, { force: true })
        }
    } else {
      const tempDir = path.join(uploadDir, 'tmp')
      await fs.mkdir(tempDir, { recursive: true })
      await convertPresentationToPdf(file.path, tempDir)
      const convertedPath = path.join(tempDir, `${path.basename(file.path, extension)}.pdf`)
      pdfBytes = await fs.readFile(convertedPath)
      await fs.rm(convertedPath, { force: true })
    }

    const saved = await createOutputFile(pdfBytes, 'powerpoint-to-pdf')
    saved.originalName = file.originalName.replace(/\.(pptx|ppt)$/i, '.pdf')
    await saved.save()

    res.json({ file: saved })
  } catch (error) {
    if (error.code === 'ENOENT' || error.message.includes('LibreOffice executable not found')) {
      return res.status(500).json({
        message: 'PowerPoint to PDF failed because LibreOffice is not installed or not available in PATH. The app also attempted a PPTX-only fallback converter.',
        error: error.message,
      })
    }

    res.status(500).json({ message: 'PowerPoint to PDF failed.', error: error.message })
  }
}

export default powerpointToPdfHandler
