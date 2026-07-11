import type { Request } from 'firebase-functions/v2/https'
import type { Response } from 'express'

// REPLACE_ME: add your production hosting domain(s) here.
// The last two entries are what the iOS/Android Capacitor shells send as
// Origin — DO NOT delete them or the native apps lose API access.
const ALLOWED_ORIGINS = [
  'https://meals4hope.web.app',
  'https://meals4hope.firebaseapp.com',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost',
]

/**
 * Applies CORS headers. Returns true if the request was a preflight and has
 * been fully handled (caller should return immediately).
 */
export function handleCors(req: Request, res: Response): boolean {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Vary', 'Origin')
  }
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    res.set('Access-Control-Max-Age', '3600')
    res.status(204).send('')
    return true
  }
  return false
}
