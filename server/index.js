import './virtualFs.js'
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import pdfRoutes from './routes/pdfRoutes.js'
import authRoutes from './routes/authRoutes.js'
import { supabase } from './lib/supabase.js'
import { PORT } from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/api/auth', authRoutes)
app.use('/api/pdf', pdfRoutes)
app.get('/api/health', async (_req, res) => {
  // Verify Supabase connectivity
  const { error } = await supabase.from('files').select('id').limit(1)
  if (error) return res.status(500).json({ status: 'error', message: error.message })
  res.json({ status: 'ok', database: 'supabase' })
})
app.use(express.static(path.join(__dirname, '../dist')))
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found.' })
  }
  const distPath = path.join(__dirname, '../dist', 'index.html')
  if (fs.existsSync(distPath)) {
    res.sendFile(distPath)
  } else {
    res.json({ status: 'ok', message: 'API server is running. Frontend is hosted separately.' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Database: Supabase`)
})
