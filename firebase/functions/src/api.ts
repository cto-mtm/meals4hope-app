import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { ZodError } from 'zod'
import { handleCors } from './helpers/cors.js'
import { getCaller } from './helpers/auth.js'
import { createUserSchema, updateUserSchema } from './models.js'

initializeApp()

// Example for later (don't define real secrets until you need them):
// import { defineSecret } from 'firebase-functions/params'
// const SOME_API_KEY = defineSecret('SOME_API_KEY')
// …then add `secrets: [SOME_API_KEY]` to the onRequest options and read it
// inside the handler with SOME_API_KEY.value().

/**
 * Single HTTP API. Hand-rolled routing — no Express, minimal dependency
 * surface. User provisioning lives here (not in the client) because creating
 * Firebase Auth users requires the Admin SDK.
 *
 * Routes:
 *   GET   /health         → liveness probe (no auth)
 *   GET   /users          → list members            (admin)
 *   POST  /users          → create member           (admin)
 *   PATCH /users/:uid     → update role/activo/name (admin)
 */
export const api = onRequest(
  { region: 'us-central1', maxInstances: 10 },
  async (req, res) => {
    if (handleCors(req, res)) return

    const path = req.path.replace(/\/+$/, '') || '/'

    try {
      if (req.method === 'GET' && path === '/health') {
        res.json({ ok: true, ts: new Date().toISOString() })
        return
      }

      // Everything below requires an active admin.
      const userRoute = path === '/users' || /^\/users\/[^/]+$/.test(path)
      if (userRoute) {
        const caller = await getCaller(req)
        if (!caller) {
          res.status(401).json({ error: 'unauthenticated' })
          return
        }
        if (caller.role !== 'admin') {
          res.status(403).json({ error: 'forbidden: admin only' })
          return
        }

        const db = getFirestore()

        if (req.method === 'GET' && path === '/users') {
          const snap = await db.collection('users').get()
          res.json({ users: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
          return
        }

        if (req.method === 'POST' && path === '/users') {
          const input = createUserSchema.parse(req.body)
          const record = await getAuth().createUser({
            email: input.email,
            ...(input.password ? { password: input.password } : {}),
            displayName: input.name,
          })
          await db.collection('users').doc(record.uid).set({
            name: input.name,
            email: input.email,
            role: input.role,
            activo: true,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: caller.uid,
          })
          logger.info('user created', { uid: record.uid, by: caller.uid })
          res.json({ success: true, uid: record.uid })
          return
        }

        if (req.method === 'PATCH') {
          const uid = path.split('/')[2]
          const input = updateUserSchema.parse(req.body)
          await db.collection('users').doc(uid).update({
            ...input,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: caller.uid,
          })
          // Deactivation also disables the Auth account so sessions die.
          if (input.activo !== undefined) {
            await getAuth().updateUser(uid, { disabled: !input.activo })
          }
          logger.info('user updated', { uid, by: caller.uid })
          res.json({ success: true })
          return
        }
      }

      res.status(404).json({
        error: 'not found',
        routes: ['GET /health', 'GET /users', 'POST /users', 'PATCH /users/:uid'],
      })
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: err.flatten() })
        return
      }
      logger.error('api error', err)
      res.status(500).json({ error: 'internal' })
    }
  }
)
