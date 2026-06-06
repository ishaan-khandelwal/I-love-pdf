const endpoints = [
  'merge','compress','split','rotate','watermark','page-numbers','crop-pdf','protect-pdf','unlock-pdf',
  'jpg-to-pdf','organize-pdf','repair-pdf','html-to-pdf','ai-summarizer','scan-to-pdf','pdf-to-word','pdf-to-excel',
  'pdf-to-powerpoint','powerpoint-to-pdf','edit-pdf','word-to-pdf','excel-to-pdf',
  'pdf-to-jpg','redact-pdf','pdf-forms','pdf-to-pdfa','ocr-pdf','compare-pdf','translate-pdf','sign-pdf'
]

const base = process.env.BASE || 'http://localhost:5001'

;(async () => {
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${base}/api/pdf/${ep}`, { method: 'POST' })
      const text = await res.text().catch(() => '')
      console.log(ep.padEnd(20), res.status, text.replace(/\s+/g, ' ').slice(0, 120))
    } catch (err) {
      console.log(ep.padEnd(20), 'ERROR', err.message)
    }
  }
})()
