#!/usr/bin/env node
/**
 * Seeds the LOCAL EMULATORS. Run while `npm run emulators` is up (from firebase/):
 *
 *   npm run seed         → admin user + catalogs (áreas, líneas)
 *   npm run seed:demo    → the above + demo members, aliados, contactos,
 *                          entradas, salidas, facturas, and activity log
 *
 * Idempotent: safe to run twice (demo data is skipped if any exists).
 * Never touches production — it hard-fails unless the emulator env vars
 * point at localhost.
 */
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

initializeApp({ projectId: 'demo-meals4hope' })
const auth = getAuth()
const db = getFirestore()

const DEMO = process.argv.includes('--demo')

const ADMIN = { email: 'admin@meals4hope.org', password: 'meals4hope', name: 'Admin M4H' }

const MEMBERS = [
  { email: 'carolina@meals4hope.org', password: 'meals4hope', name: 'Carolina' },
  { email: 'lorena@meals4hope.org', password: 'meals4hope', name: 'Lorena' },
]

const AREAS = ['Salud', 'Nutrición', 'Alimentación', 'Equipos']

const LINEAS = [
  'Apoyo a personal en primera línea (insumos, equipos, alimento)',
  'Apoyo a hospitales y centros de salud',
  'Apoyo en refugios',
  'Apoyo en comunidades afectadas',
  'Apoyo en logística',
  'Entrega de ayuda humanitaria',
  'Otros apoyos',
]

/* ── Helpers ─────────────────────────────────────────────────── */

async function ensureUser({ email, password, name }, role) {
  let user
  try {
    user = await auth.getUserByEmail(email)
    console.log(`✓ user exists (${email})`)
  } catch (err) {
    if (err?.errorInfo?.code !== 'auth/user-not-found') throw err
    user = await auth.createUser({ email, password, displayName: name })
    console.log(`✓ user created: ${email} / ${password}`)
  }
  await db.collection('users').doc(user.uid).set(
    { name, email, role, activo: true, createdAt: FieldValue.serverTimestamp() },
    { merge: true }
  )
  return user.uid
}

async function ensureCatalog(collection, names) {
  const existing = await db.collection(collection).get()
  const byName = new Map(existing.docs.map((d) => [d.data().nombre, d.id]))
  let orden = existing.size
  for (const nombre of names) {
    if (byName.has(nombre)) continue
    const ref = await db.collection(collection).add({ nombre, activo: true, orden: orden++ })
    byName.set(nombre, ref.id)
    console.log(`✓ ${collection}: ${nombre}`)
  }
  return byName // nombre → id
}

function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

/** Base fields every app-created record carries. */
function stamps(uid) {
  return {
    createdAt: FieldValue.serverTimestamp(),
    createdBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
    deletedAt: null,
  }
}

async function audit(uid, userName, entityType, entityId, entityLabel) {
  await db.collection('auditLogs').add({
    userId: uid,
    userName,
    action: 'created',
    entityType,
    entityId,
    entityLabel,
    changes: null,
    timestamp: FieldValue.serverTimestamp(),
  })
}

/* ── Base seed ───────────────────────────────────────────────── */

const adminUid = await ensureUser(ADMIN, 'admin')
const areas = await ensureCatalog('areas', AREAS)
const lineas = await ensureCatalog('lineas', LINEAS)

/* ── Demo seed (--demo) ──────────────────────────────────────── */

if (DEMO) {
  const hasData = !(await db.collection('salidas').limit(1).get()).empty
  if (hasData) {
    console.log('↷ demo data already present — skipping')
  } else {
    // Login accounts (can enter the app)…
    await ensureUser(MEMBERS[0], 'member')
    await ensureUser(MEMBERS[1], 'member')

    async function create(collection, entityType, label, data) {
      const ref = await db.collection(collection).add({ ...data, ...stamps(adminUid) })
      await audit(adminUid, ADMIN.name, entityType, ref.id, label)
      console.log(`✓ ${collection}: ${label}`)
      return ref.id
    }

    // …and team members as DATA (the "Contacto M4H" of iniciativas),
    // deliberately decoupled from accounts.
    const carolinaUid = await create('teamMembers', 'teamMember', 'Carolina', {
      name: 'Carolina',
      email: 'carolina@meals4hope.org',
      notes: null,
    })
    const lorenaUid = await create('teamMembers', 'teamMember', 'Lorena', {
      name: 'Lorena',
      email: 'lorena@meals4hope.org',
      notes: null,
    })

    /* Aliados */
    const bomberos = await create('organizations', 'organization', 'Bomberos UCV', {
      name: 'Bomberos UCV',
      type: 'beneficiario',
      notes: 'Cuerpo de bomberos voluntarios de la Universidad Central de Venezuela',
    })
    const prepara = await create('organizations', 'organization', 'Prepara Familia', {
      name: 'Prepara Familia',
      type: 'beneficiario',
      notes: null,
    })
    const suchi = await create('organizations', 'organization', 'Suchi Kito', {
      name: 'Suchi Kito',
      type: 'organizador',
      notes: 'Restaurante de sushi en Madrid',
    })
    const ensamble = await create('organizations', 'organization', 'Ensamble de Cuatros de Barcelona', {
      name: 'Ensamble de Cuatros de Barcelona',
      type: 'organizador',
      notes: null,
    })

    /* Contactos */
    const joseC = await create('contacts', 'contact', 'Cap. José Rodríguez', {
      name: 'Cap. José Rodríguez',
      metodoContacto: '+58 412 5550101',
      email: null,
      organizationId: bomberos,
      notes: null,
    })
    const maria = await create('contacts', 'contact', 'María Pérez', {
      name: 'María Pérez',
      metodoContacto: '+34 600 555 001',
      email: 'maria@suchikito.example',
      organizationId: suchi,
      notes: null,
    })

    /* Salidas */
    const salida1 = await create('salidas', 'salida', 'Equipos de rescate — Bomberos UCV', {
      titulo: 'Equipos de rescate — Bomberos UCV',
      lineasDeAccion: [lineas.get(LINEAS[0])],
      areasDeAtencion: [areas.get('Equipos')],
      fecha: daysAgo(20),
      beneficiarioId: bomberos,
      contactoExternoId: joseC,
      contactoM4hId: lorenaUid,
      descripcion: 'Compra de equipo, cuerdas y cascos',
      montoMinor: 120000, // $1,200.00
      moneda: 'USD',
      actaDeDonacion: 'firmada',
      impacto: 'General para operaciones de rescate',
      estado: 'documentada',
    })

    await create('salidas', 'salida', 'Medicinas — hospitales pediátricos', {
      titulo: 'Medicinas — hospitales pediátricos',
      lineasDeAccion: [lineas.get(LINEAS[1])],
      areasDeAtencion: [areas.get('Salud')],
      fecha: daysAgo(6),
      beneficiarioId: prepara,
      contactoExternoId: null,
      contactoM4hId: carolinaUid,
      descripcion: 'Compra de medicinas e insumos médicos',
      montoMinor: 85050, // €850.50
      moneda: 'EUR',
      actaDeDonacion: 'pendiente',
      impacto: 'Pediátricos de los hospitales Domingo Luciani, JM de los Ríos, Vargas, Pérez Carreño',
      estado: 'ejecutada',
    })

    await create('salidas', 'salida', 'Alimentos para refugios (planificada)', {
      titulo: 'Alimentos para refugios (planificada)',
      lineasDeAccion: [lineas.get(LINEAS[2])],
      areasDeAtencion: [areas.get('Alimentación')],
      fecha: null,
      beneficiarioId: null,
      contactoExternoId: null,
      contactoM4hId: carolinaUid,
      descripcion: null,
      montoMinor: null,
      moneda: 'USD',
      actaDeDonacion: 'no',
      impacto: null,
      estado: 'planificada',
    })

    /* Facturas de la salida 1 */
    await create('facturas', 'factura', 'F-00123', {
      parentType: 'salida',
      parentId: salida1,
      numero: 'F-00123',
      montoMinor: 78000,
      moneda: 'USD',
      proveedor: 'Ferretería El Cóndor',
      fecha: daysAgo(19),
      notes: 'Cuerdas y mosquetones',
    })
    await create('facturas', 'factura', 'F-00124', {
      parentType: 'salida',
      parentId: salida1,
      numero: 'F-00124',
      montoMinor: 42000,
      moneda: 'USD',
      proveedor: 'Seguridad Industrial CA',
      fecha: daysAgo(18),
      notes: 'Cascos certificados',
    })

    /* Entradas */
    await create('entradas', 'entrada', 'Iniciativa Suchi Kito', {
      nombreIniciativa: 'Iniciativa Suchi Kito',
      lineasDeAccion: [lineas.get(LINEAS[5])],
      areasDeAtencion: [areas.get('Nutrición')],
      organizadorId: suchi,
      donde: 'Madrid',
      descripcion: 'Por cada plancha de sushi donan 15€',
      fechaInicio: daysAgo(35),
      fechaFin: daysAgo(33),
      contactoExternoId: maria,
      contactoM4hId: carolinaUid,
      donaron: true,
      cantidadRecibidaMinor: 45000, // €450.00
      moneda: 'EUR',
      certificado: 'enviado',
      graciasEnviado: true,
      promocionadoInstagram: true,
      estado: 'cerrada',
    })

    await create('entradas', 'entrada', 'Concierto Solidario', {
      nombreIniciativa: 'Concierto Solidario',
      lineasDeAccion: [lineas.get(LINEAS[5])],
      areasDeAtencion: [areas.get('Alimentación')],
      organizadorId: ensamble,
      donde: 'La Illa, Barcelona',
      descripcion: 'Lo que salga por entrada, mesa con pendón y QR',
      fechaInicio: daysAgo(10),
      fechaFin: daysAgo(10),
      contactoExternoId: null,
      contactoM4hId: lorenaUid,
      donaron: false,
      cantidadRecibidaMinor: null,
      moneda: 'EUR',
      certificado: 'pendiente',
      graciasEnviado: false,
      promocionadoInstagram: true,
      estado: 'realizada',
    })

    await create('entradas', 'entrada', 'Arepas por Venezuela', {
      nombreIniciativa: 'Arepas por Venezuela',
      lineasDeAccion: [lineas.get(LINEAS[6])],
      areasDeAtencion: [areas.get('Alimentación')],
      organizadorId: null,
      donde: null, // "no sé qué lugar de Francia" — incomplete by design
      descripcion: 'Donan 1€ por arepa vendida durante el fin de semana',
      fechaInicio: null,
      fechaFin: null,
      contactoExternoId: null,
      contactoM4hId: carolinaUid,
      donaron: false,
      cantidadRecibidaMinor: null,
      moneda: 'EUR',
      certificado: 'no_aplica',
      graciasEnviado: false,
      promocionadoInstagram: false,
      estado: 'planificada',
    })
  }
}

console.log(
  `\nSeed complete${DEMO ? ' (with demo data)' : ''}. Log in at http://localhost:5173 with ${ADMIN.email} / ${ADMIN.password}`
)
