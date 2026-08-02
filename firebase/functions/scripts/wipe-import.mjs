/**
 * One-off: remove everything the Excel import created, prior to a clean
 * re-import. HARD-deletes only docs stamped createdBy == 'import-excel'
 * (and the import's own audit entries) — anything created or edited by a
 * human through the app is left untouched. Run check-preimport.mjs first.
 *
 * Usage: node scripts/wipe-import.mjs [--dry]
 */
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

process.env.GOOGLE_CLOUD_PROJECT ??= 'meals4hope-app'
initializeApp({ projectId: 'meals4hope-app' })
const db = getFirestore()

const DRY = process.argv.includes('--dry')
const deleted = {}

for (const col of ['entradas', 'organizations', 'contacts', 'teamMembers']) {
  const snap = await db.collection(col).where('createdBy', '==', 'import-excel').get()
  deleted[col] = snap.size
  if (!DRY) {
    for (const d of snap.docs) await d.ref.delete()
  }
}

const audits = await db.collection('auditLogs').where('userId', '==', 'import-excel').get()
deleted.auditLogs = audits.size
if (!DRY) {
  for (const d of audits.docs) await d.ref.delete()
}

console.log(`${DRY ? '[DRY RUN] ' : ''}Eliminado:`, deleted)
