import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import File from '../models/File.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export const uploadDir = path.join(__dirname, 'uploads')
await fs.mkdir(uploadDir, { recursive: true })

export const saveMetadata = async (file) => {
  const metadata = new File({
    originalName: file.originalname,
    path: file.path,
    size: file.size,
    contentType: file.mimetype,
  })
  return metadata.save()
}

export const loadPdf = async (filePath) => {
  const bytes = await fs.readFile(filePath)
  return PDFDocument.load(bytes)
}

export const createOutputFile = async (
  buffer,
  label,
  { extension = 'pdf', contentType = 'application/pdf' } = {}
) => {
  const outputName = `${label}-${Date.now()}.${extension}`
  const outputPath = path.join(uploadDir, outputName)
  await fs.writeFile(outputPath, buffer)
  return new File({
    originalName: outputName,
    path: outputPath,
    size: buffer.length,
    contentType,
  }).save()
}

export const parsePageRange = (range, pageCount) => {
  const pageSet = new Set()
  range.split(',').forEach((part) => {
    const trimmed = part.trim()
    if (!trimmed) return
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-')
      const start = Number(startStr)
      const end = Number(endStr)
      if (Number.isNaN(start) || Number.isNaN(end)) return
      for (let i = Math.max(1, start); i <= Math.min(end, pageCount); i += 1) {
        pageSet.add(i - 1)
      }
    } else {
      const page = Number(trimmed)
      if (!Number.isNaN(page) && page >= 1 && page <= pageCount) {
        pageSet.add(page - 1)
      }
    }
  })
  return Array.from(pageSet).sort((a, b) => a - b)
}

export const parseCropMargins = (margins) => {
  if (!margins) return null
  const values = margins.split(',').map((value) => Number(value.trim()))
  if (values.length !== 4 || values.some((value) => Number.isNaN(value))) return null
  return {
    top: values[0],
    right: values[1],
    bottom: values[2],
    left: values[3],
  }
}

export const embedStandardFont = async (document) => document.embedFont(StandardFonts.Helvetica)
export const watermarkSettings = (page, watermarkText, font) => {
  page.drawText(watermarkText || 'Confidential', {
    x: 40,
    y: page.getHeight() - 120,
    size: 48,
    font,
    color: rgb(0.6, 0.6, 0.6),
    rotate: degrees(-45),
    opacity: 0.18,
  })
}
