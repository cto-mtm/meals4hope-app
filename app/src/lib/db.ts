/**
 * Audit-wrapped Firestore access. ALL mutations on domain entities go
 * through createEntity / updateEntity / softDeleteEntity so the AuditLog
 * entry (field-level diff) is written automatically and records carry
 * denormalized createdBy/updatedBy stamps.
 *
 * Never call setDoc/updateDoc directly from a page, component, or store.
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  limit as qLimit,
  type DocumentData,
} from 'firebase/firestore'
import { db } from './firebase'
import { diff } from './diff'
import { useAuthStore } from '../stores/auth'
import type { AuditAction, AuditLog, EntityType } from '../types/models'

export const COLLECTIONS: Record<EntityType, string> = {
  entrada: 'entradas',
  salida: 'salidas',
  factura: 'facturas',
  attachment: 'attachments',
  organization: 'organizations',
  contact: 'contacts',
  area: 'areas',
  linea: 'lineas',
}

function actor() {
  const auth = useAuthStore()
  if (!auth.user) throw new Error('not authenticated')
  return { userId: auth.user.id, userName: auth.user.name }
}

/**
 * Mutations are OPTIMISTIC: the Firestore SDK applies writes to the local
 * persistent cache synchronously and syncs when connectivity returns, so we
 * don't await server acknowledgement — awaiting would hang the UI offline
 * (volunteers register initiatives from phones at events). Rule rejections
 * are logged; with rules keyed only on membership they shouldn't occur in
 * normal use.
 */
function logWriteError(context: string) {
  return (err: unknown) => console.error(`[db] ${context} failed to sync:`, err)
}

function writeAudit(
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  entityLabel: string,
  changes: Record<string, [unknown, unknown]> | null
): void {
  const { userId, userName } = actor()
  addDoc(collection(db, 'auditLogs'), {
    userId,
    userName,
    action,
    entityType,
    entityId,
    entityLabel,
    // Firestore rejects nested arrays; store the diff as JSON.
    changes: changes ? JSON.stringify(changes) : null,
    timestamp: serverTimestamp(),
  }).catch(logWriteError(`audit ${action} ${entityType}/${entityId}`))
}

/* ── Mutations ───────────────────────────────────────────────── */

export async function createEntity(
  type: EntityType,
  data: Record<string, unknown>,
  label: string
): Promise<string> {
  const { userId } = actor()
  const ref = doc(collection(db, COLLECTIONS[type]))
  setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    createdBy: userId,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
    deletedAt: null,
  }).catch(logWriteError(`create ${type}`))
  writeAudit('created', type, ref.id, label, null)
  return ref.id
}

export async function updateEntity(
  type: EntityType,
  id: string,
  patch: Record<string, unknown>,
  before: Record<string, unknown>,
  label: string
): Promise<void> {
  const { userId } = actor()
  const changes = diff(before, patch)
  if (Object.keys(changes).length === 0) return
  updateDoc(doc(db, COLLECTIONS[type], id), {
    ...patch,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  }).catch(logWriteError(`update ${type}/${id}`))
  writeAudit('updated', type, id, label, changes)
}

export async function softDeleteEntity(
  type: EntityType,
  id: string,
  label: string
): Promise<void> {
  const { userId } = actor()
  updateDoc(doc(db, COLLECTIONS[type], id), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  }).catch(logWriteError(`delete ${type}/${id}`))
  writeAudit('deleted', type, id, label, null)
}

/* ── Reads ───────────────────────────────────────────────────── */

function mapDoc<T>(id: string, data: DocumentData): T {
  return { id, ...data } as T
}

/** All non-deleted docs of a collection. Filtering/sorting happens client-side —
 * an internal NGO tool has low volume, and this avoids composite indexes. */
export async function fetchAll<T>(type: EntityType): Promise<T[]> {
  const snap = await getDocs(collection(db, COLLECTIONS[type]))
  return snap.docs
    .map((d) => mapDoc<T>(d.id, d.data()))
    .filter((d) => (d as { deletedAt?: unknown }).deletedAt == null)
}

export async function fetchById<T>(type: EntityType, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, COLLECTIONS[type], id))
  if (!snap.exists()) return null
  return mapDoc<T>(snap.id, snap.data())
}

export async function fetchChildren<T>(
  type: 'factura' | 'attachment',
  parentType: string,
  parentId: string
): Promise<T[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS[type]),
      where('parentType', '==', parentType),
      where('parentId', '==', parentId)
    )
  )
  return snap.docs
    .map((d) => mapDoc<T>(d.id, d.data()))
    .filter((d) => (d as { deletedAt?: unknown }).deletedAt == null)
}

/* ── Audit reads ─────────────────────────────────────────────── */

function mapAudit(id: string, data: DocumentData): AuditLog {
  return {
    id,
    userId: data.userId,
    userName: data.userName,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    entityLabel: data.entityLabel,
    changes: data.changes ? JSON.parse(data.changes) : null,
    timestamp: data.timestamp ?? null,
  }
}

export async function fetchHistory(entityType: EntityType, entityId: string): Promise<AuditLog[]> {
  const snap = await getDocs(
    query(
      collection(db, 'auditLogs'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'desc')
    )
  )
  return snap.docs.map((d) => mapAudit(d.id, d.data()))
}

export async function fetchRecentActivity(count = 50): Promise<AuditLog[]> {
  const snap = await getDocs(
    query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), qLimit(count))
  )
  return snap.docs.map((d) => mapAudit(d.id, d.data()))
}
