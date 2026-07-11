/**
 * Shared directory: Organizations (partners), Contacts, and M4H Users —
 * the "Quién" of Entradas y Salidas. Cached per session; quick-create
 * helpers support inline creation from the Entrada/Salida forms.
 */
import { defineStore } from 'pinia'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { createEntity, fetchAll, updateEntity } from '../lib/db'
import type { Contact, Organization, OrgType, User } from '../types/models'

interface State {
  organizations: Organization[]
  contacts: Contact[]
  users: User[]
  loaded: boolean
}

export const useDirectoryStore = defineStore('directory', {
  state: (): State => ({ organizations: [], contacts: [], users: [], loaded: false }),
  getters: {
    orgName: (s) => (id: string | null) =>
      id ? (s.organizations.find((o) => o.id === id)?.name ?? '—') : '—',
    contactName: (s) => (id: string | null) =>
      id ? (s.contacts.find((c) => c.id === id)?.name ?? '—') : '—',
    userName: (s) => (id: string | null) =>
      id ? (s.users.find((u) => u.id === id)?.name ?? '—') : '—',
    activeUsers: (s) => s.users.filter((u) => u.activo),
  },
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return
      const [orgs, contacts, usersSnap] = await Promise.all([
        fetchAll<Organization>('organization'),
        fetchAll<Contact>('contact'),
        getDocs(collection(db, 'users')),
      ])
      this.organizations = orgs.sort((a, b) => a.name.localeCompare(b.name))
      this.contacts = contacts.sort((a, b) => a.name.localeCompare(b.name))
      this.users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as User)
      this.loaded = true
    },
    async quickCreateOrg(name: string, type: OrgType): Promise<string> {
      const id = await createEntity('organization', { name, type, notes: null }, name)
      await this.load(true)
      return id
    },
    async updateOrg(
      org: Organization,
      patch: { name: string; type: OrgType; notes: string | null }
    ): Promise<void> {
      await updateEntity(
        'organization',
        org.id,
        patch,
        org as unknown as Record<string, unknown>,
        patch.name
      )
      await this.load(true)
    },
    async updateContact(
      contact: Contact,
      patch: {
        name: string
        phone: string | null
        email: string | null
        organizationId: string | null
        notes: string | null
      }
    ): Promise<void> {
      await updateEntity(
        'contact',
        contact.id,
        patch,
        contact as unknown as Record<string, unknown>,
        patch.name
      )
      await this.load(true)
    },
    async quickCreateContact(
      name: string,
      phone: string | null,
      organizationId: string | null
    ): Promise<string> {
      const id = await createEntity(
        'contact',
        { name, phone, email: null, organizationId, notes: null },
        name
      )
      await this.load(true)
      return id
    },
  },
})
