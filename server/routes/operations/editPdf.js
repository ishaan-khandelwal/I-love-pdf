import fs from 'fs/promises'
import { PDFDocument, rgb } from 'pdf-lib'
import File from '../../models/File.js'
import { createOutputFile, embedStandardFont } from '../pdfHelpers.js'

function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b)
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex)
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 }
}

const editPdfHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) {
      return res.status(404).json({ message: 'PDF file not found.' })
    }

    const pdfBuffer = await fs.readFile(file.path)
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const font = await embedStandardFont(pdfDoc)
    const pages = pdfDoc.getPages()

    let annotations = req.body.annotations

    // Legacy fallback for backward compatibility
    if (!annotations && req.body.annotationText) {
      annotations = pages.map((_, index) => ({
        pageIndex: index,
        type: 'text',
        text: req.body.annotationText,
        x: 40,
        y: 40,
        fontSize: 12,
        color: '#1a1a99',
        isLegacyStamp: true,
      }))
    }

    if (annotations && Array.isArray(annotations)) {
      for (const ann of annotations) {
        const pageIndex = Number(ann.pageIndex)
        if (pageIndex < 0 || pageIndex >= pages.length) continue

        const page = pages[pageIndex]
        const { height } = page.getSize()
        const colorRgb = hexToRgb(ann.color || '#000000')

        if (ann.type === 'text') {
          const text = String(ann.text || '').trim()
          if (!text) continue

          const fontSize = Number(ann.fontSize) || 12
          const x = Number(ann.x) || 0
          const y = Number(ann.y) || 0

          // Convert coordinates:
          // Frontend: origin at top-left
          // PDF-lib: origin at bottom-left
          const yPdf = ann.isLegacyStamp ? y : (height - y - fontSize)

          page.drawText(text, {
            x,
            y: yPdf,
            size: fontSize,
            font,
            color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
            opacity: ann.isLegacyStamp ? 0.75 : 1.0,
          })
        } else if (ann.type === 'drawing') {
          const points = ann.points
          if (!points || !Array.isArray(points) || points.length < 2) continue

          const thickness = Number(ann.thickness) || 3

          for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i]
            const p2 = points[i + 1]
            if (!p1 || !p2 || p1.length < 2 || p2.length < 2) continue

            page.drawLine({
              start: { x: Number(p1[0]), y: height - Number(p1[1]) },
              end: { x: Number(p2[0]), y: height - Number(p2[1]) },
              thickness,
              color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
            })
          }
        }
      }
    }

    const bytes = await pdfDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'edit-pdf')
    saved.originalName = file.originalName.replace(/\.pdf$/i, '-edited.pdf')
    await saved.save()

    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'PDF edit failed.', error: error.message })
  }
}

export default editPdfHandler

