<script setup lang="ts">
// Create + edit form for Iniciativas. Only `nombreIniciativa` is required —
// real initiatives arrive with unknown venues/contacts/amounts.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '../components/BaseButton.vue'
import BaseInput from '../components/BaseInput.vue'
import BaseSelect from '../components/BaseSelect.vue'
import BaseTextarea from '../components/BaseTextarea.vue'
import MoneyInput from '../components/MoneyInput.vue'
import QuickCreateContact from '../components/QuickCreateContact.vue'
import QuickCreatePartner from '../components/QuickCreatePartner.vue'
import QuickCreateTeamMember from '../components/QuickCreateTeamMember.vue'
import { createEntity, fetchById, updateEntity } from '../lib/db'
import { useDirectoryStore } from '../stores/directory'
import {
  CERTIFICADO_ESTADOS,
  CURRENCIES,
  ESTADOS_ENTRADA,
  MEDIOS_DONACION,
  type CertificadoEstado,
  type Currency,
  type Entrada,
  type EstadoEntrada,
} from '../types/models'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const directory = useDirectoryStore()

const editId = route.params.id as string | undefined
const isEdit = computed(() => !!editId)

interface IniciativaForm {
  nombreIniciativa: string | null
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
  medioDonacion: string | null
  certificado: CertificadoEstado
  graciasEnviado: boolean
  promocionadoInstagram: boolean
  estado: EstadoEntrada
}

const form = ref<IniciativaForm>({
  nombreIniciativa: null,
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
  medioDonacion: null,
  certificado: 'no_aplica',
  graciasEnviado: false,
  promocionadoInstagram: false,
  estado: 'planificada',
})

const before = ref<Entrada | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

/** Selected-pill tone per estado — mirrors EstadoChip's palette. */
const ESTADO_PILL: Record<EstadoEntrada, string> = {
  planificada: 'border-brand-600/40 bg-brand-50 font-bold text-brand-600',
  realizada: 'border-sun-700/40 bg-sun-100 font-bold text-sun-700',
  donacion_recibida: 'border-leaf-700/40 bg-leaf-100 font-bold text-leaf-700',
  cerrada: 'border-ink-400/40 bg-mist-100 font-bold text-ink-600',
}

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
      router.push({ name: 'iniciativa-detail', params: { id: editId } })
    } else {
      // Áreas/Líneas left the UI in the 2026 redesign; the fields stay in the
      // schema (empty) so existing data and a future comeback keep working.
      const id = await createEntity(
        'entrada',
        {
          ...data,
          lineasDeAccion: [],
          areasDeAtencion: [],
          certificadoImagenUrl: null,
          certificadoImagenPath: null,
        },
        data.nombreIniciativa
      )
      router.push({ name: 'iniciativa-detail', params: { id } })
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await directory.load()
  if (editId) {
    const e = await fetchById<Entrada>('entrada', editId)
    if (e) {
      before.value = e
      form.value = {
        nombreIniciativa: e.nombreIniciativa,
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
        medioDonacion: e.medioDonacion ?? null,
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
  <div class="mx-auto max-w-[820px]">
    <button type="button" class="mb-3.5 text-[12.5px] font-semibold text-brand-600" @click="router.back()">
      ← {{ t('iniciativas.volver') }}
    </button>
    <h1 class="mb-5 text-[22px] font-bold tracking-[-0.3px]">
      {{ isEdit ? t('iniciativas.editTitle') : t('iniciativas.newTitle') }}
    </h1>

    <p v-if="loading" class="text-[13px] text-ink-400">{{ t('common.cargando') }}</p>

    <form v-else class="space-y-3.5" @submit.prevent="save">
      <!-- Qué y quién -->
      <section class="rounded-card bg-white px-6 py-6 shadow-card">
        <h2 class="mb-4 text-[11px] font-bold tracking-[0.6px] text-ink-400 uppercase">
          {{ t('iniciativas.sectionQuien') }}
        </h2>
        <BaseInput
          v-model="form.nombreIniciativa"
          :label="t('iniciativas.nombreIniciativa')"
          :placeholder="t('iniciativas.nombrePlaceholder')"
          required
        />
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <BaseSelect
              v-model="form.organizadorId"
              :label="t('iniciativas.organizador')"
              allow-empty
              :options="directory.organizations.map((o) => ({ value: o.id, label: o.name }))"
            />
            <div class="mt-1.5">
              <QuickCreatePartner default-type="organizador" @created="(id) => (form.organizadorId = id)" />
            </div>
          </div>
          <BaseInput v-model="form.donde" :label="t('iniciativas.donde')" :placeholder="t('iniciativas.dondePlaceholder')" />
        </div>
        <div class="mt-4">
          <BaseTextarea v-model="form.descripcion" :label="t('common.descripcion')" :placeholder="t('iniciativas.descripcionPlaceholder')" />
        </div>
      </section>

      <!-- Cuándo y contactos -->
      <section class="rounded-card bg-white px-6 py-6 shadow-card">
        <h2 class="mb-4 text-[11px] font-bold tracking-[0.6px] text-ink-400 uppercase">
          {{ t('iniciativas.sectionCuando') }}
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <BaseInput v-model="form.fechaInicio" :label="t('iniciativas.fechaInicio')" type="date" />
          <BaseInput v-model="form.fechaFin" :label="t('iniciativas.fechaFin')" type="date" :hint="t('iniciativas.fechaFinHint')" />
          <div>
            <BaseSelect
              v-model="form.contactoExternoId"
              :label="t('common.contactoExterno')"
              allow-empty
              :options="directory.contacts.map((c) => ({ value: c.id, label: c.name }))"
            />
            <div class="mt-1.5">
              <QuickCreateContact @created="(id) => (form.contactoExternoId = id)" />
            </div>
          </div>
          <div>
            <BaseSelect
              v-model="form.contactoM4hId"
              :label="t('common.contactoM4h')"
              allow-empty
              :options="directory.teamMembers.map((m) => ({ value: m.id, label: m.name }))"
            />
            <div class="mt-1.5">
              <QuickCreateTeamMember @created="(id) => (form.contactoM4hId = id)" />
            </div>
          </div>
        </div>
      </section>

      <!-- Donación y seguimiento -->
      <section class="rounded-card bg-white px-6 py-6 shadow-card">
        <h2 class="mb-4 text-[11px] font-bold tracking-[0.6px] text-ink-400 uppercase">
          {{ t('iniciativas.sectionDonacion') }}
        </h2>
        <label class="flex items-center gap-2.5 text-[13.5px] font-semibold">
          <input v-model="form.donaron" type="checkbox" class="h-4 w-4 accent-brand-600" />
          {{ t('iniciativas.donaronLabel') }}
        </label>
        <p class="mt-1.5 ml-6.5 text-xs text-ink-400">{{ t('iniciativas.donaronHint') }}</p>
        <div v-if="form.donaron" class="mt-3 ml-6.5 grid grid-cols-2 gap-4">
          <MoneyInput v-model="form.cantidadRecibidaMinor" :label="t('iniciativas.cantidad')" />
          <BaseSelect
            v-model="form.moneda"
            :label="t('common.moneda')"
            :options="CURRENCIES.map((c) => ({ value: c, label: c }))"
          />
        </div>

        <div class="mt-4">
          <BaseSelect
            v-model="form.medioDonacion"
            :label="t('iniciativas.medioDonacion')"
            allow-empty
            :options="MEDIOS_DONACION.map((m) => ({ value: m, label: m }))"
          />
        </div>

        <div class="my-4.5 h-px bg-line-100" />

        <div class="grid items-end gap-4 sm:grid-cols-2">
          <BaseSelect
            v-model="form.certificado"
            :label="t('iniciativas.certificado')"
            :options="CERTIFICADO_ESTADOS.map((e) => ({ value: e, label: t(`common.estados.${e}`) }))"
          />
          <div class="flex flex-col gap-2.5 pb-0.5">
            <label class="flex items-center gap-2.5 text-[13px] font-semibold">
              <input v-model="form.graciasEnviado" type="checkbox" class="h-4 w-4 accent-brand-600" />
              {{ t('iniciativas.graciasLabel') }}
            </label>
            <label class="flex items-center gap-2.5 text-[13px] font-semibold">
              <input v-model="form.promocionadoInstagram" type="checkbox" class="h-4 w-4 accent-brand-600" />
              {{ t('iniciativas.igLabel') }}
            </label>
          </div>
        </div>
      </section>

      <!-- Estado -->
      <section class="rounded-card bg-white px-6 py-6 shadow-card">
        <h2 class="mb-2.5 text-[12.5px] font-semibold">{{ t('common.estado') }}</h2>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="e in ESTADOS_ENTRADA"
            :key="e"
            type="button"
            class="rounded-full border px-3.5 py-1.5 text-xs transition-colors"
            :class="form.estado === e ? ESTADO_PILL[e] : 'border-line-200 font-semibold text-ink-600 hover:bg-mist-200'"
            @click="form.estado = e"
          >
            <template v-if="form.estado === e">✓ </template>{{ t(`common.estados.${e}`) }}
          </button>
        </div>
        <p class="mt-2 text-xs text-ink-400">{{ t('iniciativas.estadoHint') }}</p>
      </section>

      <p v-if="estadoWarning" class="rounded-lg bg-sun-100 px-3 py-2 text-xs text-sun-700">
        {{ t('iniciativas.warnDonacion') }}
      </p>
      <p v-if="error" class="text-sm text-danger-600">{{ error }}</p>

      <div class="flex gap-2.5 pt-1.5">
        <BaseButton type="submit" :disabled="saving">
          {{ saving ? t('common.cargando') : t('common.guardar') }}
        </BaseButton>
        <BaseButton variant="secondary" @click="router.back()">{{ t('common.cancelar') }}</BaseButton>
      </div>
    </form>
  </div>
</template>
