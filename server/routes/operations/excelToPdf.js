import fs from 'fs/promises'
import xlsx from 'xlsx'
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

const excelToPdfHandler = async (req, res) => {
  try {
    const { fileId } = req.body
    const file = await File.findById(fileId)
    if (!file) return res.status(404).json({ message: 'Excel document not found.' })

    const fileBuffer = await fs.readFile(file.path)
    
    const wb = xlsx.read(fileBuffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 }) // 2D array

    const pdfDoc = await PDFDocument.create()
    const font = await embedStandardFont(pdfDoc)
    const fontBold = await pdfDoc.embedFont('Helvetica-Bold')

    let page = pdfDoc.addPage([595, 842]) // A4 Size
    let y = 800
    const margin = 30
    const printableWidth = 595 - margin * 2

    page.drawText(`Sheet: ${wb.SheetNames[0]}`, { x: margin, y, size: 16, font: fontBold, color: rgb(0, 0.4, 0.2) })
    y -= 30

    if (data.length === 0) {
        page.drawText('No data found in the Excel document.', { x: margin, y, size: 12, font })
    }

    // Determine column widths simply based on max columns
    const maxCols = Math.max(...data.map(row => row.length), 1)
    const colWidth = printableWidth / maxCols

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex]
      const fontSize = 9
      let maxLinesInRow = 1
      
      const rowLines = row.map(cell => {
          const str = normalizeForPdf(cell)
          const wrapped = wrapText(str, colWidth - 10, font, fontSize)
          if (wrapped.length > maxLinesInRow) maxLinesInRow = wrapped.length
          return wrapped
      })

      const rowHeight = (fontSize + 4) * maxLinesInRow + 10

      if (y - rowHeight < 40) {
        page = pdfDoc.addPage([595, 842])
        y = 800
      }

      // Draw cells
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const x = margin + (colIndex * colWidth)
        const cellLines = rowLines[colIndex]
        
        // Draw border
        page.drawRectangle({
            x, y: y - rowHeight, width: colWidth, height: rowHeight,
            borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1
        })

        // Draw text
        let textY = y - 12
        for (const line of cellLines) {
            page.drawText(line, {
                x: x + 5,
                y: textY,
                size: fontSize,
                font: rowIndex === 0 ? fontBold : font,
                color: rgb(0.1, 0.1, 0.1),
            })
            textY -= fontSize + 4
        }
      }

      y -= rowHeight
    }

    const bytes = await pdfDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'excel-to-pdf')
    
    saved.originalName = file.originalName.replace(/\.xlsx?$/i, '.pdf')
    await saved.save()

    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'Excel to PDF failed.', error: error.message })
  }
}

export default excelToPdfHandler
