import { PDFDocument, rgb } from 'pdf-lib'
import { createOutputFile, embedStandardFont } from '../pdfHelpers.js'

const wrapText = (text, width, font, fontSize) => {
  const words = text.split(/\s+/)
  const lines = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = font.widthOfTextAtSize(testLine, fontSize)
    if (testWidth > width) {
      lines.push(currentLine)
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

const htmlToPdfHandler = async (req, res) => {
  try {
    const { htmlContent } = req.body
    if (!htmlContent) {
      return res.status(400).json({ message: 'HTML content or URL is required.' })
    }

    let rawHTML = htmlContent.trim()
    
    // If it is a URL, fetch its content
    if (rawHTML.startsWith('http://') || rawHTML.startsWith('https://')) {
      try {
        const response = await fetch(rawHTML)
        if (!response.ok) {
          return res.status(400).json({ message: `Failed to fetch URL. Server returned status: ${response.status}` })
        }
        rawHTML = await response.text()
      } catch (err) {
        return res.status(400).json({ message: `Unable to connect to the URL: ${err.message}` })
      }
    }

    // Basic stripping of HTML tags and scripts
    const cleanedHTML = rawHTML
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')

    const paragraphs = cleanedHTML
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)

    const pdfDoc = await PDFDocument.create()
    const font = await embedStandardFont(pdfDoc)
    const fontBold = await pdfDoc.embedFont('Helvetica-Bold')

    let page = pdfDoc.addPage([595, 842]) // A4 Size
    let y = 800
    const margin = 50
    const printableWidth = 595 - margin * 2

    // Title / Header of PDF
    page.drawText('Webpage HTML Conversion Output', {
      x: margin,
      y: y,
      size: 16,
      font: fontBold,
      color: rgb(0.9, 0.2, 0.18),
    })
    y -= 30

    page.drawText(`Source: ${htmlContent.substring(0, 70)}${htmlContent.length > 70 ? '...' : ''}`, {
      x: margin,
      y: y,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    y -= 40

    for (const para of paragraphs) {
      // Basic heuristic to decide if paragraph is a heading
      const isHeading = para.length < 80 && (para.startsWith('Heading') || para.toUpperCase() === para)
      const fontSize = isHeading ? 14 : 10
      const currentFont = isHeading ? fontBold : font
      const color = isHeading ? rgb(0.1, 0.1, 0.1) : rgb(0.2, 0.2, 0.2)
      
      const wrappedLines = wrapText(para, printableWidth, currentFont, fontSize)

      for (const line of wrappedLines) {
        if (y < 60) {
          page = pdfDoc.addPage([595, 842])
          y = 800
        }
        page.drawText(line, {
          x: margin,
          y: y,
          size: fontSize,
          font: currentFont,
          color,
        })
        y -= fontSize + 6
      }
      y -= 10 // gap between paragraphs
    }

    const bytes = await pdfDoc.save({ useObjectStreams: true, compress: true })
    const saved = await createOutputFile(bytes, 'from-html')
    res.json({ file: saved })
  } catch (error) {
    res.status(500).json({ message: 'HTML to PDF failed.', error: error.message })
  }
}

export default htmlToPdfHandler
