import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import pdfRoutes from './routes/pdfRoutes.js'
import { MONGO_URI, PORT } from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/api/pdf', pdfRoutes)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})
app.use(express.static(path.join(__dirname, '../dist')))
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found.' })
  }
  res.sendFile(path.join(__dirname, '../dist', 'index.html'))
})

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error)
    process.exit(1)
  })
