import crypto from 'crypto'

const inMemoryFiles = new Map()

class FileRecord {
  constructor(data) {
    this.id = data.id || crypto.randomUUID()
    this._id = this.id // Explicit property for JSON serialization
    this.originalName = data.original_name ?? data.originalName
    this.path = data.path
    this.size = data.size
    this.contentType = data.content_type ?? data.contentType
    this.createdAt = data.created_at ?? data.createdAt ?? new Date()
  }

  /**
   * Save (insert or update) this record.
   * Returns a FileRecord instance with the saved data.
   */
  async save() {
    inMemoryFiles.set(this.id, this)
    return this
  }

  // ─── Static methods (mirrors Mongoose Model statics) ───────────────────────

  static async findById(id) {
    if (!id) return null
    return inMemoryFiles.get(id) || null
  }

  static async find(filter) {
    let list = Array.from(inMemoryFiles.values())
    if (filter && filter._id && filter._id.$in) {
      const ids = filter._id.$in
      list = list.filter((file) => ids.includes(file.id))
    }
    // Order by created_at descending
    return list.sort((a, b) => b.createdAt - a.createdAt)
  }

  static deleteById(id) {
    if (!id) return false
    return inMemoryFiles.delete(id)
  }

  /**
   * Create and immediately save a new record.
   * Mirrors Mongoose's Model.create(attrs) which returns the saved document.
   */
  static async create(attrs) {
    const record = new FileRecord(attrs)
    return record.save()
  }
}

// Stale files garbage collector (runs every 5 minutes)
// Purges any in-memory files older than 10 minutes to prevent RAM growth.
setInterval(() => {
  const now = Date.now()
  const cutoff = 10 * 60 * 1000 // 10 minutes
  for (const file of inMemoryFiles.values()) {
    const fileTime = file.createdAt instanceof Date ? file.createdAt.getTime() : new Date(file.createdAt).getTime()
    if (now - fileTime > cutoff) {
      inMemoryFiles.delete(file.id)
      
      // Purge from virtualFs in-memory map
      import('../virtualFs.js').then(({ memoryStorage }) => {
        import('path').then((path) => {
          memoryStorage.delete(path.normalize(file.path))
        })
      }).catch((err) => console.error('GC error purging memoryStorage:', err.message))
    }
  }
}, 5 * 60 * 1000)

export default FileRecord
