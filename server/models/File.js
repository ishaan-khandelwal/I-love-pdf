import mongoose from 'mongoose'

const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  contentType: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
})

export default mongoose.model('File', fileSchema)
