import fs from 'fs/promises'
import path from 'path'
import { PDFDocument } from 'pdf-lib'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node scripts/split_file.js <input.pdf> [output-dir]')
  process.exit(1)
}

const outputDir = process.argv[3] ? process.argv[3] : path.join(process.cwd(), 'uploads', 'processed')

const run = async () => {
  await fs.mkdir(outputDir, { recursive: true })
  const bytes = await fs.readFile(inputPath)
  const sourceDoc = await PDFDocument.load(bytes)
  const pageCount = sourceDoc.getPageCount()
  console.log(`Input: ${inputPath}`)
  console.log(`Pages: ${pageCount}`)

  for (let i = 0; i < pageCount; i += 1) {
    const outDoc = await PDFDocument.create()
    const [page] = await outDoc.copyPages(sourceDoc, [i])
    outDoc.addPage(page)
    const outBytes = await outDoc.save()
    const baseName = path.basename(inputPath, path.extname(inputPath))
    const outName = `${baseName}-page-${i + 1}.pdf`
    const outPath = path.join(outputDir, outName)
    await fs.writeFile(outPath, outBytes)
    console.log(`Saved ${outPath}`)
  }
}

run().catch((err) => {
  console.error('Error splitting PDF:', err)
  process.exit(1)
})
