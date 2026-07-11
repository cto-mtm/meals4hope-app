import type { Timestamp } from 'firebase/firestore'

/* ── Vocabulary ──────────────────────────────────────────────── */

export type Currency = 'USD' | 'EUR' | 'VES'
export const CURRENCIES: Currency[] = ['USD', 'EUR', 'VES']

export type Role = 'admin' | 'member'

export type EstadoSalida = 'planificada' | 'ejecutada' | 'documentada'
export const ESTADOS_SALIDA: EstadoSalida[] = ['planificada', 'ejecutada', 'documentada']

export type EstadoEntrada = 'planificada' | 'realizada' | 'donacion_recibida' | 'cerrada'
export const ESTADOS_ENTRADA: EstadoEntrada[] = [
  'planificada',
  'realizada',
  'donacion_recibida',
  'cerrada',
]

export type ActaEstado = 'no' | 'pendiente' | 'firmada'
export const ACTA_ESTADOS: ActaEstado[] = ['no', 'pendiente', 'firmada']

export type CertificadoEstado = 'no_aplica' | 'pendiente' | 'enviado'
export const CERTIFICADO_ESTADOS: CertificadoEstado[] = ['no_aplica', 'pendiente', 'enviado']

export type OrgType = 'beneficiario' | 'organizador' | 'ambos'
export const ORG_TYPES: OrgType[] = ['beneficiario', 'organizador', 'ambos']

export type ParentType = 'entrada' | 'salida' | 'factura'

/* ── Base ────────────────────────────────────────────────────── */

/** Denormalized audit stamps carried on every record for quick display. */
export interface BaseDoc {
  id: string
  createdAt: Timestamp | null
  createdBy: string | null
  updatedAt: Timestamp | null
  updatedBy: string | null
  /** Soft delete — nothing is ever hard-deleted (audit integrity). */
  deletedAt: Timestamp | null
}

/* ── Supporting entities ─────────────────────────────────────── */

export interface User {
  id: string
  name: string
  email: string
  role: Role
  activo: boolean
}

export interface Organization extends BaseDoc {
  name: string
  type: OrgType
  notes: string | null
}

export interface Contact extends BaseDoc {
  name: string
  phone: string | null
  email: string | null
  organizationId: string | null
  notes: string | null
}

export interface CatalogItem {
  id: string
  nombre: string
  activo: boolean
  orden: number
}

export interface Attachment extends BaseDoc {
  parentType: ParentType
  parentId: string
  fileUrl: string
  /** Storage path — kept so files can be managed later. */
  storagePath: string
  contentType: string
  caption: string | null
}

export interface Factura extends BaseDoc {
  parentType: 'entrada' | 'salida'
  parentId: string
  numero: string | null
  /** Integer minor units (cents). Never a float. */
  montoMinor: number | null
  moneda: Currency
  proveedor: string | null
  /** Date-only, ISO 'YYYY-MM-DD'. */
  fecha: string | null
  notes: string | null
}

/* ── Core entities ───────────────────────────────────────────── */

/**
 * Nullable-friendly by design: real records arrive with missing data
 * (unknown contacts, unknown venues, pending amounts). `estado` signals
 * completeness — not required fields.
 */
export interface Salida extends BaseDoc {
  titulo: string
  lineasDeAccion: string[] // catalog ids
  areasDeAtencion: string[] // catalog ids
  fecha: string | null // 'YYYY-MM-DD'
  beneficiarioId: string | null // Organization
  contactoExternoId: string | null // Contact
  contactoM4hId: string | null // User
  descripcion: string | null
  montoMinor: number | null
  moneda: Currency
  actaDeDonacion: ActaEstado
  impacto: string | null
  estado: EstadoSalida
}

export interface Entrada extends BaseDoc {
  nombreIniciativa: string
  lineasDeAccion: string[]
  areasDeAtencion: string[]
  organizadorId: string | null // Organization
  donde: string | null
  descripcion: string | null
  fechaInicio: string | null // 'YYYY-MM-DD'
  fechaFin: string | null // 'YYYY-MM-DD' (ranges: weekend initiatives)
  contactoExternoId: string | null
  contactoM4hId: string | null
  donaron: boolean
  cantidadRecibidaMinor: number | null
  moneda: Currency
  certificado: CertificadoEstado
  graciasEnviado: boolean
  promocionadoInstagram: boolean
  estado: EstadoEntrada
}

/* ── Audit ───────────────────────────────────────────────────── */

export type AuditAction = 'created' | 'updated' | 'deleted'

export type EntityType =
  | 'entrada'
  | 'salida'
  | 'factura'
  | 'attachment'
  | 'organization'
  | 'contact'
  | 'area'
  | 'linea'

export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: AuditAction
  entityType: EntityType
  entityId: string
  /** Human-readable label of the record at mutation time (for feeds). */
  entityLabel: string
  /** field → [old, new] */
  changes: Record<string, [unknown, unknown]> | null
  timestamp: Timestamp | null
}
