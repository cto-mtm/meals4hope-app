/**
 * One-off import: iniciativas from the "Acciones solidarias" Excel into
 * PRODUCTION Firestore. Reads the JSON produced by the parsing step
 * (import-data.json) — never the Excel directly.
 *
 * Auth: Application Default Credentials (run `gcloud auth login --update-adc`
 * first). Idempotent: rows whose nombreIniciativa already exists are skipped,
 * aliados/team members/contacts are deduped by name.
 *
 * Usage:
 *   node scripts/import-iniciativas.mjs <path/to/import-data.json> [--dry]
 */
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const PROJECT = 'meals4hope-app'
const IMPORT_UID = 'import-excel'
const IMPORT_NAME = 'Import Excel'

const [jsonPath, ...flags] = process.argv.slice(2)
const DRY = flags.includes('--dry')
if (!jsonPath) {
  console.error('usage: node scripts/import-iniciativas.mjs <import-data.json> [--dry]')
  process.exit(1)
}

const rows = JSON.parse(readFileSync(jsonPath, 'utf8'))

process.env.GOOGLE_CLOUD_PROJECT ??= PROJECT
initializeApp({ projectId: PROJECT })
const db = getFirestore()

const stamps = () => ({
  createdAt: FieldValue.serverTimestamp(),
  createdBy: IMPORT_UID,
  updatedAt: FieldValue.serverTimestamp(),
  updatedBy: IMPORT_UID,
  deletedAt: null,
})

async function audit(entityType, entityId, entityLabel) {
  if (DRY) return
  await db.collection('auditLogs').add({
    userId: IMPORT_UID,
    userName: IMPORT_NAME,
    action: 'created',
    entityType,
    entityId,
    entityLabel,
    changes: null,
    timestamp: FieldValue.serverTimestamp(),
  })
}

/** name (lowercased) -> doc id, seeded from existing docs for idempotency. */
async function indexByName(collection) {
  const snap = await db.collection(collection).get()
  const map = new Map()
  for (const d of snap.docs) {
    const data = d.data()
    if (data.deletedAt == null && data.name) map.set(data.name.toLowerCase(), d.id)
  }
  return map
}

const existingEntradas = new Set(
  (await db.collection('entradas').get()).docs
    .filter((d) => d.data().deletedAt == null)
    .map((d) => (d.data().nombreIniciativa ?? '').toLowerCase())
)
const orgs = await indexByName('organizations')
const team = await indexByName('teamMembers')
const contacts = await indexByName('contacts')

const created = { organizations: 0, teamMembers: 0, contacts: 0, entradas: 0, skipped: 0 }

async function ensure(map, collection, entityType, name, data, counterKey) {
  const key = name.toLowerCase()
  if (map.has(key)) return map.get(key)
  if (DRY) {
    map.set(key, `dry-${counterKey}-${map.size}`)
    created[counterKey]++
    return map.get(key)
  }
  const ref = await db.collection(collection).add({ ...data, ...stamps() })
  await audit(entityType, ref.id, name)
  map.set(key, ref.id)
  created[counterKey]++
  return ref.id
}

for (const row of rows) {
  if (existingEntradas.has(row.nombreIniciativa.toLowerCase())) {
    created.skipped++
    console.log(`↷ fila ${row.fila}: «${row.nombreIniciativa}» ya existe — omitida`)
    continue
  }

  const orgId = await ensure(
    orgs, 'organizations', 'organization', row.aliado,
    { name: row.aliado, type: 'organizador', notes: row.notasAliado ?? null },
    'organizations'
  )

  let gestoraId = null
  if (row.gestora) {
    gestoraId = await ensure(
      team, 'teamMembers', 'teamMember', row.gestora,
      { name: row.gestora, email: null, notes: null },
      'teamMembers'
    )
  }

  let contactoId = null
  if (row.contacto) {
    contactoId = await ensure(
      contacts, 'contacts', 'contact', row.contacto.name,
      {
        name: row.contacto.name,
        metodoContacto: row.contacto.metodoContacto,
        email: null,
        organizationId: orgId,
        notes: null,
      },
      'contacts'
    )
  }

  const entrada = {
    nombreIniciativa: row.nombreIniciativa,
    lineasDeAccion: [],
    areasDeAtencion: [],
    organizadorId: orgId,
    donde: null,
    descripcion: row.descripcion,
    fechaInicio: row.fechaInicio,
    fechaFin: row.fechaFin,
    contactoExternoId: contactoId,
    contactoM4hId: gestoraId,
    donaron: row.donaron,
    cantidadRecibidaMinor: row.cantidadRecibidaMinor,
    moneda: row.moneda,
    medioDonacion: row.medioDonacion,
    certificado: 'no_aplica',
    certificadoImagenUrl: null,
    certificadoImagenPath: null,
    graciasEnviado: false,
    promocionadoInstagram: false,
    estado: row.estado,
  }

  if (!DRY) {
    const ref = await db.collection('entradas').add({ ...entrada, ...stamps() })
    await audit('entrada', ref.id, row.nombreIniciativa)
  }
  created.entradas++
  console.log(`✓ fila ${row.fila}: ${row.nombreIniciativa}`)
}

console.log(`\n${DRY ? '[DRY RUN] ' : ''}Resumen:`, created)
