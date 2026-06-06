import path from 'path'
import fs from 'fs'
import fsPromises from 'fs/promises'

export const memoryStorage = new Map()

export const isUploadPath = (p) => {
  if (!p || typeof p !== 'string') return false
  const normalized = path.normalize(p)
  return normalized.includes('uploads')
}

// Apply monkey-patches
const origReadFile = fsPromises.readFile
fsPromises.readFile = async (pathOrFd, options) => {
  if (isUploadPath(pathOrFd)) {
    const norm = path.normalize(pathOrFd)
    const data = memoryStorage.get(norm)
    if (data !== undefined) {
      if (options === 'utf8' || (options && options.encoding === 'utf8')) {
        return data.toString('utf8')
      }
      return data
    }
  }
  return origReadFile(pathOrFd, options)
}

const origWriteFile = fsPromises.writeFile
fsPromises.writeFile = async (file, data, options) => {
  if (isUploadPath(file)) {
    const norm = path.normalize(file)
    const buf = Buffer.isBuffer(data) ? data : typeof data === 'string' ? Buffer.from(data) : Buffer.from(data.buffer || data)
    memoryStorage.set(norm, buf)
    return
  }
  return origWriteFile(file, data, options)
}

const origStat = fsPromises.stat
fsPromises.stat = async (p, options) => {
  if (isUploadPath(p)) {
    const norm = path.normalize(p)
    const data = memoryStorage.get(norm)
    if (data !== undefined) {
      return {
        size: data.length,
        isFile: () => true,
        isDirectory: () => false,
      }
    }
  }
  return origStat(p, options)
}

const origRm = fsPromises.rm
fsPromises.rm = async (p, options) => {
  if (isUploadPath(p)) {
    const norm = path.normalize(p)
    memoryStorage.delete(norm)
    return
  }
  return origRm(p, options)
}

const origMkdir = fsPromises.mkdir
fsPromises.mkdir = async (p, options) => {
  if (isUploadPath(p)) {
    return
  }
  return origMkdir(p, options)
}

// Callback version patches
const origReadFileCb = fs.readFile
fs.readFile = (pathOrFd, options, callback) => {
  const cb = typeof options === 'function' ? options : callback
  const opts = typeof options === 'function' ? undefined : options
  if (isUploadPath(pathOrFd)) {
    const norm = path.normalize(pathOrFd)
    const data = memoryStorage.get(norm)
    if (data !== undefined) {
      const result = (opts === 'utf8' || (opts && opts.encoding === 'utf8')) ? data.toString('utf8') : data
      process.nextTick(() => cb(null, result))
      return
    }
  }
  return origReadFileCb(pathOrFd, options, callback)
}

const origWriteFileCb = fs.writeFile
fs.writeFile = (file, data, options, callback) => {
  const cb = typeof options === 'function' ? options : callback
  if (isUploadPath(file)) {
    const norm = path.normalize(file)
    const buf = Buffer.isBuffer(data) ? data : typeof data === 'string' ? Buffer.from(data) : Buffer.from(data.buffer || data)
    memoryStorage.set(norm, buf)
    process.nextTick(() => cb(null))
    return
  }
  return origWriteFileCb(file, data, options, callback)
}
