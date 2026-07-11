<script setup lang="ts">
// Create + edit form for Salidas. Nullable-friendly by design: only
// `titulo` is required — records are created early and completed over
// time (estado signals completeness, not required fields).
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '../components/BaseButton.vue'
import BaseInput from '../components/BaseInput.vue'
import BaseMultiSelect from '../components/BaseMultiSelect.vue'
import BaseSelect from '../components/BaseSelect.vue'
import BaseTextarea from '../components/BaseTextarea.vue'
import MoneyInput from '../components/MoneyInput.vue'
import QuickCreateContact from '../components/QuickCreateContact.vue'
import QuickCreatePartner from '../components/QuickCreatePartner.vue'
import { createEntity, fetchById, updateEntity } from '../lib/db'
import { useCatalogsStore } from '../stores/catalogs'
import { useDirectoryStore } from '../stores/directory'
import {
  ACTA_ESTADOS,
  CURRENCIES,
  ESTADOS_SALIDA,
  type ActaEstado,
  type Currency,
  type EstadoSalida,
  type Salida,
} from '../types/models'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const catalogs = useCatalogsStore()
const directory = useDirectoryStore()

const editId = route.params.id as string | undefined
const isEdit = computed(() => !!editId)

interface SalidaForm {
  titulo: string | null
  lineasDeAccion: string[]
  areasDeAtencion: string[]
  fecha: string | null
  beneficiarioId: string | null
  contactoExternoId: string | null
  contactoM4hId: string | null
  descripcion: string | null
  montoMinor: number | null
  moneda: Currency
  actaDeDonacion: ActaEstado
  impacto: string | null
  estado: EstadoSalida
}

const form = ref<SalidaForm>({
  titulo: null,
  lineasDeAccion: [],
  areasDeAtencion: [],
  fecha: null,
  beneficiarioId: null,
  contactoExternoId: null,
  contactoM4hId: null,
  descripcion: null,
  montoMinor: null,
  moneda: 'USD',
  actaDeDonacion: 'no',
  impacto: null,
  estado: 'planificada',
})

const before = ref<Salida | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

// Non-blocking consistency hint: `documentada` means facturas + acta are
// complete. Nullable-friendly philosophy — we warn, never block.
const estadoWarning = computed(
  () => form.value.estado === 'documentada' && form.value.actaDeDonacion !== 'firmada'
)

async function save() {
  if (!form.value.titulo?.trim()) return
  saving.value = true
  error.value = null
  try {
    const data = { ...form.value, titulo: form.value.titulo.trim() }
    if (isEdit.value && editId) {
      await updateEntity(
        'salida',
        editId,
        data,
        before.value as unknown as Record<string, unknown>,
        data.titulo
      )
      router.push({ name: 'salida-detail', params: { id: editId } })
    } else {
      const id = await createEntity('salida', data, data.titulo)
      router.push({ name: 'salida-detail', params: { id } })
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([catalogs.load(), directory.load()])
  if (editId) {
    const s = await fetchById<Salida>('salida', editId)
    if (s) {
      before.value = s
      form.value = {
        titulo: s.titulo,
        lineasDeAccion: [...s.lineasDeAccion],
        areasDeAtencion: [...s.areasDeAtencion],
        fecha: s.fecha,
        beneficiarioId: s.beneficiarioId,
        contactoExternoId: s.contactoExternoId,
        contactoM4hId: s.contactoM4hId,
        descripcion: s.descripcion,
        montoMinor: s.montoMinor,
        moneda: s.moneda,
        actaDeDonacion: s.actaDeDonacion,
        impacto: s.impacto,
        estado: s.estado,
      }
    }
  }
  loading.value = false
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <h1 class="mb-4 text-xl font-bold">
      {{ isEdit ? t('salidas.editTitle') : t('salidas.newTitle') }}
    </h1>

    <p v-if="loading" class="text-sm text-stone-400">{{ t('common.cargando') }}</p>

    <form v-else class="space-y-5" @submit.prevent="save">
      <BaseInput v-model="form.titulo" :label="t('salidas.titulo')" required />

      <BaseMultiSelect
        v-model="form.lineasDeAccion"
        :label="t('common.lineas')"
        :options="catalogs.activeLineas.map((l) => ({ value: l.id, label: l.nombre }))"
      />
      <BaseMultiSelect
        v-model="form.areasDeAtencion"
        :label="t('common.areas')"
        :options="catalogs.activeAreas.map((a) => ({ value: a.id, label: a.nombre }))"
      />

      <div class="grid grid-cols-2 gap-3">
        <BaseInput v-model="form.fecha" :label="t('common.fecha')" type="date" />
        <BaseSelect
          v-model="form.estado"
          :label="t('common.estado')"
          :options="ESTADOS_SALIDA.map((e) => ({ value: e, label: t(`common.estados.${e}`) }))"
        />
      </div>

      <div>
        <BaseSelect
          v-model="form.beneficiarioId"
          :label="t('salidas.beneficiario')"
          allow-empty
          :options="directory.organizations.map((o) => ({ value: o.id, label: o.name }))"
        />
        <div class="mt-1">
          <QuickCreatePartner default-type="beneficiario" @created="(id) => (form.beneficiarioId = id)" />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <BaseSelect
            v-model="form.contactoExternoId"
            :label="t('common.contactoExterno')"
            allow-empty
            :options="directory.contacts.map((c) => ({ value: c.id, label: c.name }))"
          />
          <div class="mt-1">
            <QuickCreateContact @created="(id) => (form.contactoExternoId = id)" />
          </div>
        </div>
        <BaseSelect
          v-model="form.contactoM4hId"
          :label="t('common.contactoM4h')"
          allow-empty
          :options="directory.activeUsers.map((u) => ({ value: u.id, label: u.name }))"
        />
      </div>

      <BaseTextarea v-model="form.descripcion" :label="t('common.descripcion')" />

      <div class="grid grid-cols-2 gap-3">
        <MoneyInput v-model="form.montoMinor" :label="t('common.monto')" />
        <BaseSelect
          v-model="form.moneda"
          :label="t('common.moneda')"
          :options="CURRENCIES.map((c) => ({ value: c, label: c }))"
        />
      </div>

      <BaseSelect
        v-model="form.actaDeDonacion"
        :label="t('salidas.acta')"
        :options="ACTA_ESTADOS.map((e) => ({ value: e, label: t(`common.estados.${e}`) }))"
      />

      <BaseTextarea v-model="form.impacto" :label="t('salidas.impacto')" :placeholder="t('salidas.impactoPlaceholder')" />

      <p v-if="estadoWarning" class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        {{ t('salidas.warnDocumentada') }}
      </p>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex gap-2">
        <BaseButton type="submit" :disabled="saving">
          {{ saving ? t('common.cargando') : t('common.guardar') }}
        </BaseButton>
        <BaseButton variant="secondary" @click="router.back()">{{ t('common.cancelar') }}</BaseButton>
      </div>

      <p v-if="!isEdit" class="text-xs text-stone-400">{{ t('salidas.attachAfterCreate') }}</p>
    </form>
  </div>
</template>
