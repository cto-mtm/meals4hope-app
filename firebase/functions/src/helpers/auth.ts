import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import type { Request } from 'firebase-functions/v2/https'

export interface Caller {
  uid: string
  role: 'admin' | 'member'
  name: string
}

/**
 * Verifies the Bearer ID token and loads the caller's users/{uid} doc.
 * Returns null when the token is missing/invalid or the user is inactive.
 */
export async function getCaller(req: Request): Promise<Caller | null> {
  const header = req.headers.authorization ?? ''
  const match = header.match(/^Bearer (.+)$/)
  if (!match) return null
  try {
    const decoded = await getAuth().verifyIdToken(match[1])
    const snap = await getFirestore().collection('users').doc(decoded.uid).get()
    const data = snap.data()
    if (!data || data.activo !== true) return null
    return { uid: decoded.uid, role: data.role, name: data.name }
  } catch {
    return null
  }
}
