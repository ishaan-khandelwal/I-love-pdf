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
  wordToPdfHandler,
  excelToPdfHandler,
} from './operations/index.js'
import { saveMetadata, uploadDir } from './pdfHelpers.js'

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_')
    cb(null, `${Date.now()}-${safeName}`)
  },
})

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

router.post('/merge', mergeHandler)
router.post('/compress', compressHandler)
router.post('/split', splitHandler)
router.post('/rotate', rotateHandler)
router.post('/watermark', watermarkHandler)
router.post('/page-numbers', pageNumbersHandler)
router.post('/crop-pdf', cropPdfHandler)
router.post('/protect-pdf', protectPdfHandler)
router.post('/unlock-pdf', unlockPdfHandler)
router.post('/jpg-to-pdf', jpgToPdfHandler)
router.post('/organize-pdf', organizePdfHandler)
router.post('/repair-pdf', repairPdfHandler)
router.post('/html-to-pdf', htmlToPdfHandler)
router.post('/ai-summarizer', aiSummarizerHandler)
router.post('/scan-to-pdf', jpgToPdfHandler) // Reuses JPG-to-PDF logic
router.post('/pdf-to-word', pdfToWordHandler)
router.post('/pdf-to-excel', pdfToExcelHandler)
router.post('/pdf-to-powerpoint', pdfToPptHandler)
router.post('/word-to-pdf', wordToPdfHandler)
router.post('/excel-to-pdf', excelToPdfHandler)

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
    res.download(file.path, file.originalName)
  } catch (error) {
    res.status(500).json({ message: 'Download failed.', error: error.message })
  }
})

export default router
