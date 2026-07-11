/**
 * Admin-editable catalogs: Áreas de Atención + Líneas de Acción.
 * Stored in Firestore (not hardcoded enums) so M4H can add entries
 * without a deploy. Cached once per session.
 */
import { defineStore } from 'pinia'
import { createEntity, fetchAll, updateEntity } from '../lib/db'
import type { CatalogItem } from '../types/models'

interface State {
  areas: CatalogItem[]
  lineas: CatalogItem[]
  loaded: boolean
}

export const useCatalogsStore = defineStore('catalogs', {
  state: (): State => ({ areas: [], lineas: [], loaded: false }),
  getters: {
    areaName: (s) => (id: string) => s.areas.find((a) => a.id === id)?.nombre ?? id,
    lineaName: (s) => (id: string) => s.lineas.find((l) => l.id === id)?.nombre ?? id,
    activeAreas: (s) => s.areas.filter((a) => a.activo),
    activeLineas: (s) => s.lineas.filter((l) => l.activo),
  },
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return
      const [areas, lineas] = await Promise.all([
        fetchAll<CatalogItem>('area'),
        fetchAll<CatalogItem>('linea'),
      ])
      this.areas = areas.sort((a, b) => a.orden - b.orden)
      this.lineas = lineas.sort((a, b) => a.orden - b.orden)
      this.loaded = true
    },
    async addItem(type: 'area' | 'linea', nombre: string) {
      const list = type === 'area' ? this.areas : this.lineas
      await createEntity(type, { nombre, activo: true, orden: list.length }, nombre)
      await this.load(true)
    },
    async toggleItem(type: 'area' | 'linea', item: CatalogItem) {
      await updateEntity(
        type,
        item.id,
        { activo: !item.activo },
        { activo: item.activo },
        item.nombre
      )
      await this.load(true)
    },
  },
})
