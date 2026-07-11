<script setup lang="ts">
// Create + edit form for Entradas. Only `nombreIniciativa` is required —
// real initiatives arrive with unknown venues/contacts/amounts.
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
  CERTIFICADO_ESTADOS,
  CURRENCIES,
  ESTADOS_ENTRADA,
  type CertificadoEstado,
  type Currency,
  type Entrada,
  type EstadoEntrada,
} from '../types/models'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const catalogs = useCatalogsStore()
const directory = useDirectoryStore()

const editId = route.params.id as string | undefined
const isEdit = computed(() => !!editId)

interface EntradaForm {
  nombreIniciativa: string | null
  lineasDeAccion: string[]
  areasDeAtencion: string[]
  organizadorId: string | null
  donde: string | null
  descripcion: string | null
  fechaInicio: string | null
  fechaFin: string | null
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

const form = ref<EntradaForm>({
  nombreIniciativa: null,
  lineasDeAccion: [],
  areasDeAtencion: [],
  organizadorId: null,
  donde: null,
  descripcion: null,
  fechaInicio: null,
  fechaFin: null,
  contactoExternoId: null,
  contactoM4hId: null,
  donaron: false,
  cantidadRecibidaMinor: null,
  moneda: 'EUR',
  certificado: 'no_aplica',
  graciasEnviado: false,
  promocionadoInstagram: false,
  estado: 'planificada',
})

const before = ref<Entrada | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

// Non-blocking consistency hint: these estados imply the donation arrived.
// Nullable-friendly philosophy — we warn, never block.
const estadoWarning = computed(
  () =>
    (form.value.estado === 'donacion_recibida' || form.value.estado === 'cerrada') &&
    !form.value.donaron
)

async function save() {
  if (!form.value.nombreIniciativa?.trim()) return
  saving.value = true
  error.value = null
  try {
    const data = { ...form.value, nombreIniciativa: form.value.nombreIniciativa.trim() }
    if (isEdit.value && editId) {
      await updateEntity(
        'entrada',
        editId,
        data,
        before.value as unknown as Record<string, unknown>,
        data.nombreIniciativa
      )
      router.push({ name: 'entrada-detail', params: { id: editId } })
    } else {
      const id = await createEntity('entrada', data, data.nombreIniciativa)
      router.push({ name: 'entrada-detail', params: { id } })
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
    const e = await fetchById<Entrada>('entrada', editId)
    if (e) {
      before.value = e
      form.value = {
        nombreIniciativa: e.nombreIniciativa,
        lineasDeAccion: [...e.lineasDeAccion],
        areasDeAtencion: [...e.areasDeAtencion],
        organizadorId: e.organizadorId,
        donde: e.donde,
        descripcion: e.descripcion,
        fechaInicio: e.fechaInicio,
        fechaFin: e.fechaFin,
        contactoExternoId: e.contactoExternoId,
        contactoM4hId: e.contactoM4hId,
        donaron: e.donaron,
        cantidadRecibidaMinor: e.cantidadRecibidaMinor,
        moneda: e.moneda,
        certificado: e.certificado,
        graciasEnviado: e.graciasEnviado,
        promocionadoInstagram: e.promocionadoInstagram,
        estado: e.estado,
      }
    }
  }
  loading.value = false
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <h1 class="mb-4 text-xl font-bold">
      {{ isEdit ? t('entradas.editTitle') : t('entradas.newTitle') }}
    </h1>

    <p v-if="loading" class="text-sm text-stone-400">{{ t('common.cargando') }}</p>

    <form v-else class="space-y-5" @submit.prevent="save">
      <BaseInput
        v-model="form.nombreIniciativa"
        :label="t('entradas.nombreIniciativa')"
        :placeholder="t('entradas.nombrePlaceholder')"
        required
      />

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

      <div>
        <BaseSelect
          v-model="form.organizadorId"
          :label="t('entradas.organizador')"
          allow-empty
          :options="directory.organizations.map((o) => ({ value: o.id, label: o.name }))"
        />
        <div class="mt-1">
          <QuickCreatePartner default-type="organizador" @created="(id) => (form.organizadorId = id)" />
        </div>
      </div>

      <BaseInput v-model="form.donde" :label="t('entradas.donde')" :placeholder="t('entradas.dondePlaceholder')" />
      <BaseTextarea v-model="form.descripcion" :label="t('common.descripcion')" :placeholder="t('entradas.descripcionPlaceholder')" />

      <div class="grid grid-cols-2 gap-3">
        <BaseInput v-model="form.fechaInicio" :label="t('entradas.fechaInicio')" type="date" />
        <BaseInput v-model="form.fechaFin" :label="t('entradas.fechaFin')" type="date" :hint="t('entradas.fechaFinHint')" />
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

      <!-- Donation received -->
      <fieldset class="rounded-xl border border-stone-200 bg-white p-4">
        <label class="flex items-center gap-2 text-sm font-medium text-stone-700">
          <input v-model="form.donaron" type="checkbox" class="h-4 w-4 accent-brand-700" />
          {{ t('entradas.donaronLabel') }}
        </label>
        <div v-if="form.donaron" class="mt-3 grid grid-cols-2 gap-3">
          <MoneyInput v-model="form.cantidadRecibidaMinor" :label="t('entradas.cantidad')" />
          <BaseSelect
            v-model="form.moneda"
            :label="t('common.moneda')"
            :options="CURRENCIES.map((c) => ({ value: c, label: c }))"
          />
        </div>
      </fieldset>

      <!-- Follow-up -->
      <fieldset class="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <BaseSelect
          v-model="form.certificado"
          :label="t('entradas.certificado')"
          :options="CERTIFICADO_ESTADOS.map((e) => ({ value: e, label: t(`common.estados.${e}`) }))"
        />
        <label class="flex items-center gap-2 text-sm text-stone-700">
          <input v-model="form.graciasEnviado" type="checkbox" class="h-4 w-4 accent-brand-700" />
          {{ t('entradas.graciasLabel') }}
        </label>
        <label class="flex items-center gap-2 text-sm text-stone-700">
          <input v-model="form.promocionadoInstagram" type="checkbox" class="h-4 w-4 accent-brand-700" />
          {{ t('entradas.igLabel') }}
        </label>
      </fieldset>

      <BaseSelect
        v-model="form.estado"
        :label="t('common.estado')"
        :options="ESTADOS_ENTRADA.map((e) => ({ value: e, label: t(`common.estados.${e}`) }))"
      />

      <p v-if="estadoWarning" class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        {{ t('entradas.warnDonacion') }}
      </p>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex gap-2">
        <BaseButton type="submit" :disabled="saving">
          {{ saving ? t('common.cargando') : t('common.guardar') }}
        </BaseButton>
        <BaseButton variant="secondary" @click="router.back()">{{ t('common.cancelar') }}</BaseButton>
      </div>
    </form>
  </div>
</template>
