import express from 'express'
import multer from 'multer'
import File from '../models/File.js'
import {
  mergeHandler,
  compressHandler,
  splitHandler,
  rotateHandler,
  watermarkHandler,
  pageNumbersHandler,
  cropPdfHandler,
  protectPdfHandler,
  unlockPdfHandler,
  jpgToPdfHandler,
  organizePdfHandler,
  repairPdfHandler,
  htmlToPdfHandler,
  aiSummarizerHandler,
  pdfToWordHandler,
  pdfToExcelHandler,
  pdfToPptHandler,
  powerpointToPdfHandler,
  editPdfHandler,
  wordToPdfHandler,
  excelToPdfHandler,
  pdfToJpgHandler,
  redactPdfHandler,
  pdfFormsHandler,
  pdfToPdfAHandler,
  ocrPdfHandler,
  comparePdfHandler,
  translatePdfHandler,
  signPdfHandler,
} from './operations/index.js'
import { saveMetadata, uploadDir } from './pdfHelpers.js'

import path from 'path'
import { memoryStorage as virtualFs } from '../virtualFs.js'

const storage = multer.memoryStorage()

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf', 
      'image/jpeg', 
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    cb(null, allowed.includes(file.mimetype))
  },
})

const router = express.Router()

router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: 'Upload at least one PDF or image file.' })
    }

    req.files.forEach((file) => {
      const safeName = file.originalname.replace(/\s+/g, '_')
      const virtualPath = path.join(uploadDir, `${Date.now()}-${safeName}`)
      virtualFs.set(path.normalize(virtualPath), file.buffer)
      file.path = virtualPath
    })

    const savedFiles = await Promise.all(req.files.map(saveMetadata))
    res.json({ files: savedFiles })
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload files.', error: error.message })
  }
})

router.get('/files', async (_req, res) => {
  try {
    const files = await File.find()
    res.json({ files })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load files.', error: error.message })
  }
})

const cleanUpSourceFiles = (handler) => {
  return async (req, res, next) => {
    const { fileId, fileIds, fileAId, fileBId } = req.body
    const ids = []
    if (fileId) ids.push(fileId)
    if (fileAId) ids.push(fileAId)
    if (fileBId) ids.push(fileBId)
    if (Array.isArray(fileIds)) ids.push(...fileIds)

    res.on('finish', async () => {
      // Delay slightly to ensure handlers have fully finished any async reading
      setTimeout(async () => {
        for (const id of ids) {
          try {
            const file = await File.findById(id)
            if (file) {
              virtualFs.delete(path.normalize(file.path))
              File.deleteById(id)
            }
          } catch (err) {
            console.error('Error cleaning up file:', id, err.message)
          }
        }
      }, 1000)
    })

    return handler(req, res, next)
  }
}

router.post('/merge', cleanUpSourceFiles(mergeHandler))
router.post('/compress', cleanUpSourceFiles(compressHandler))
router.post('/split', cleanUpSourceFiles(splitHandler))
router.post('/rotate', cleanUpSourceFiles(rotateHandler))
router.post('/watermark', cleanUpSourceFiles(watermarkHandler))
router.post('/page-numbers', cleanUpSourceFiles(pageNumbersHandler))
router.post('/crop-pdf', cleanUpSourceFiles(cropPdfHandler))
router.post('/protect-pdf', cleanUpSourceFiles(protectPdfHandler))
router.post('/unlock-pdf', cleanUpSourceFiles(unlockPdfHandler))
router.post('/jpg-to-pdf', cleanUpSourceFiles(jpgToPdfHandler))
router.post('/organize-pdf', cleanUpSourceFiles(organizePdfHandler))
router.post('/repair-pdf', cleanUpSourceFiles(repairPdfHandler))
router.post('/html-to-pdf', cleanUpSourceFiles(htmlToPdfHandler))
router.post('/ai-summarizer', cleanUpSourceFiles(aiSummarizerHandler))
router.post('/scan-to-pdf', cleanUpSourceFiles(jpgToPdfHandler)) // Reuses JPG-to-PDF logic
router.post('/pdf-to-word', cleanUpSourceFiles(pdfToWordHandler))
router.post('/pdf-to-excel', cleanUpSourceFiles(pdfToExcelHandler))
router.post('/pdf-to-powerpoint', cleanUpSourceFiles(pdfToPptHandler))
router.post('/powerpoint-to-pdf', cleanUpSourceFiles(powerpointToPdfHandler))
router.post('/edit-pdf', cleanUpSourceFiles(editPdfHandler))
router.post('/word-to-pdf', cleanUpSourceFiles(wordToPdfHandler))
router.post('/excel-to-pdf', cleanUpSourceFiles(excelToPdfHandler))
router.post('/pdf-to-jpg', cleanUpSourceFiles(pdfToJpgHandler))
router.post('/redact-pdf', cleanUpSourceFiles(redactPdfHandler))
router.post('/pdf-forms', cleanUpSourceFiles(pdfFormsHandler))
router.post('/pdf-to-pdfa', cleanUpSourceFiles(pdfToPdfAHandler))
router.post('/ocr-pdf', cleanUpSourceFiles(ocrPdfHandler))
router.post('/compare-pdf', cleanUpSourceFiles(comparePdfHandler))
router.post('/translate-pdf', cleanUpSourceFiles(translatePdfHandler))
router.post('/sign-pdf', cleanUpSourceFiles(signPdfHandler))

router.post('/:tool', async (req, res) => {
  const tool = req.params.tool
  const supported = [
    'merge',
    'split',
    'compress',
    'rotate',
    'watermark',
    'page-numbers',
    'crop-pdf',
    'protect-pdf',
    'unlock-pdf',
    'jpg-to-pdf',
    'organize-pdf',
    'repair-pdf',
    'html-to-pdf',
    'ai-summarizer',
    'scan-to-pdf',
    'pdf-to-word',
    'pdf-to-excel',
    'pdf-to-powerpoint',
    'powerpoint-to-pdf',
    'edit-pdf',
    'word-to-pdf',
    'excel-to-pdf',
  ]
  if (supported.includes(tool)) {
    return res.status(404).json({ message: 'Operation handler not found for this tool.' })
  }
  res.status(501).json({ message: `The ${tool} tool is not implemented yet. This route is a placeholder.` })
})

router.get('/download/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
    if (!file) {
      return res.status(404).json({ message: 'File not found.' })
    }
    const normPath = path.normalize(file.path)
    const buffer = virtualFs.get(normPath)
    if (buffer) {
      res.setHeader('Content-Type', file.contentType || 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`)
      res.send(buffer)
      
      // Purge processed file immediately after download finishes
      res.on('finish', () => {
        virtualFs.delete(normPath)
        File.deleteById(file.id)
      })
      return
    }
    res.download(file.path, file.originalName)
  } catch (error) {
    res.status(500).json({ message: 'Download failed.', error: error.message })
  }
})

export default router
