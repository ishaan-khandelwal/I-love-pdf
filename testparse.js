import fs from 'fs/promises'

// pdfjs-dist is installed as a dependency of pdf-parse
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

const uploads = await fs.readdir('./server/routes/uploads')
const pdfFile = uploads.find(f => f.endsWith('.pdf'))
if (!pdfFile) { console.log('No PDF found'); process.exit(1) }

const buf = await fs.readFile('./server/routes/uploads/' + pdfFile)
const uint8arr = new Uint8Array(buf)

const doc = await pdfjsLib.getDocument({ data: uint8arr }).promise
console.log('Pages:', doc.numPages)

let allText = ''
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i)
  const content = await page.getTextContent()
  allText += content.items.map(item => item.str).join(' ')
}

console.log('Extracted text:', allText.substring(0, 300))
console.log('SUCCESS!')
