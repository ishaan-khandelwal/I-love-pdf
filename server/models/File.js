/**
 * Drop-in Supabase replacement for the Mongoose File model.
 * Exposes the same interface: File.findById(), File.create(), File.find(), instance.save()
 * so that zero changes are needed in any operation file.
 */
import { supabase } from '../lib/supabase.js'

class FileRecord {
  constructor(data) {
    // Support both snake_case (from Supabase) and camelCase (from new FileRecord({...}))
    this.id = data.id || null
    this._id = this.id // Explicit property for JSON serialization
    this.originalName = data.original_name ?? data.originalName
    this.path = data.path
    this.size = data.size
    this.contentType = data.content_type ?? data.contentType
    this.createdAt = data.created_at ?? data.createdAt ?? new Date()
  }

  // Mongoose used _id; keep _id as an alias for id so download routes work
  get _id() { return this.id }

  /**
   * Save (insert or update) this record.
   * Returns a FileRecord instance with the saved data (including DB-generated id).
   */
  async save() {
    if (this.id) {
      // Update existing row
      const { data, error } = await supabase
        .from('files')
        .update({
          original_name: this.originalName,
          path: this.path,
          size: this.size,
          content_type: this.contentType,
        })
        .eq('id', this.id)
        .select()
        .single()
      if (error) throw new Error(`Supabase update error: ${error.message}`)
      return new FileRecord(data)
    } else {
      // Insert new row
      const { data, error } = await supabase
        .from('files')
        .insert({
          original_name: this.originalName,
          path: this.path,
          size: this.size,
          content_type: this.contentType,
        })
        .select()
        .single()
      if (error) throw new Error(`Supabase insert error: ${error.message}`)
      const saved = new FileRecord(data)
      this.id = saved.id
      return saved
    }
  }

  // ─── Static methods (mirrors Mongoose Model statics) ───────────────────────

  static async findById(id) {
    if (!id) return null
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Supabase findById error: ${error.message}`)
    return data ? new FileRecord(data) : null
  }

  static async find() {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Supabase find error: ${error.message}`)
    return (data || []).map((d) => new FileRecord(d))
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

export default FileRecord
