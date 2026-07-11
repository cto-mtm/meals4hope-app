/**
 * Attachment uploads: client-side photo compression + Firebase Storage.
 * Volunteers upload phone photos of receipts at events — compressing to
 * ~1600px JPEG keeps uploads fast on mobile data.
 */
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { storage } from './firebase'
import type { ParentType } from '../types/models'

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82

async function compressImage(file: File): Promise<Blob> {
  // PDFs and non-images pass through untouched.
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.type === 'image/jpeg') return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    return blob ?? file
  } catch {
    return file // HEIC in some browsers can't be decoded — upload as-is
  }
}

export interface UploadedFile {
  fileUrl: string
  storagePath: string
  contentType: string
}

export async function uploadAttachment(
  file: File,
  parentType: ParentType,
  parentId: string
): Promise<UploadedFile> {
  const blob = await compressImage(file)
  const contentType = blob.type || file.type
  const ext = contentType === 'application/pdf' ? 'pdf' : 'jpg'
  const path = `attachments/${parentType}/${parentId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const ref = storageRef(storage, path)
  await uploadBytes(ref, blob, { contentType })
  const fileUrl = await getDownloadURL(ref)
  return { fileUrl, storagePath: path, contentType }
}
