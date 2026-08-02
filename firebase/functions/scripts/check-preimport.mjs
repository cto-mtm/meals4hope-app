// Read-only pre-import check: (1) the 3 admin accounts exist, (2) no HUMAN
// edits on import-created data since the v1 import (safe-to-wipe check).
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

process.env.GOOGLE_CLOUD_PROJECT ??= 'meals4hope-app'
initializeApp({ projectId: 'meals4hope-app' })
const db = getFirestore()

const users = (await db.collection('users').get()).docs.map((d) => ({
  uid: d.id,
  email: d.data().email,
  name: d.data().name,
  role: d.data().role,
  activo: d.data().activo,
}))

// Human touches on import-owned collections: anything not stamped by the import.
const touched = []
for (const col of ['entradas', 'organizations', 'contacts', 'teamMembers']) {
  const snap = await db.collection(col).get()
  for (const d of snap.docs) {
    const x = d.data()
    if (x.createdBy !== 'import-excel' || (x.updatedBy && x.updatedBy !== 'import-excel')) {
      touched.push({ col, id: d.id, label: x.nombreIniciativa ?? x.name, createdBy: x.createdBy, updatedBy: x.updatedBy })
    }
  }
}

console.log(JSON.stringify({ users, humanTouched: touched }, null, 1))
