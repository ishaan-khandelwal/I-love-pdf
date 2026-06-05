import dotenv from 'dotenv'

dotenv.config()

export const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/i-love-pdf'
export const PORT = process.env.PORT || 5000
