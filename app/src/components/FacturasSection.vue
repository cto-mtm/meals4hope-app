<script setup lang="ts">
// Facturas (receipts) sub-list with inline add/edit. Belongs to a Salida,
// or optionally an Entrada (received-donation proof). Each factura can
// carry its own attachments (receipt photos).
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AttachmentsSection from './AttachmentsSection.vue'
import BaseButton from './BaseButton.vue'
import BaseInput from './BaseInput.vue'
import BaseModal from './BaseModal.vue'
import BaseSelect from './BaseSelect.vue'
import BaseTextarea from './BaseTextarea.vue'
import MoneyInput from './MoneyInput.vue'
import { createEntity, fetchChildren, softDeleteEntity, updateEntity } from '../lib/db'
import { formatMoney } from '../lib/money'
import { CURRENCIES, type Currency, type Factura } from '../types/models'

const props = defineProps<{ parentType: 'entrada' | 'salida'; parentId: string }>()
const { t } = useI18n()

const facturas = ref<Factura[]>([])

async function load() {
  facturas.value = await fetchChildren<Factura>('factura', props.parentType, props.parentId)
}

/* ── Form modal ──────────────────────────────────────────────── */
interface FacturaForm {
  numero: string | null
  montoMinor: number | null
  moneda: Currency
  proveedor: string | null
  fecha: string | null
  notes: string | null
}
const empty = (): FacturaForm => ({
  numero: null,
  montoMinor: null,
  moneda: 'USD',
  proveedor: null,
  fecha: null,
  notes: null,
})
const showForm = ref(false)
const editing = ref<Factura | null>(null)
const form = ref<FacturaForm>(empty())
const saving = ref(false)

function openNew() {
  editing.value = null
  form.value = empty()
  showForm.value = true
}

function openEdit(f: Factura) {
  editing.value = f
  form.value = {
    numero: f.numero,
    montoMinor: f.montoMinor,
    moneda: f.moneda,
    proveedor: f.proveedor,
    fecha: f.fecha,
    notes: f.notes,
  }
  showForm.value = true
}

function label(f: FacturaForm | Factura) {
  return f.numero ?? f.proveedor ?? t('facturas.one')
}

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await updateEntity(
        'factura',
        editing.value.id,
        { ...form.value },
        editing.value as unknown as Record<string, unknown>,
        label(form.value)
      )
    } else {
      await createEntity(
        'factura',
        { parentType: props.parentType, parentId: props.parentId, ...form.value },
        label(form.value)
      )
    }
    showForm.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(f: Factura) {
  if (!confirm(t('facturas.confirmDelete'))) return
  await softDeleteEntity('factura', f.id, label(f))
  await load()
}

const monedaOptions = CURRENCIES.map((c) => ({ value: c, label: c }))

onMounted(load)
</script>

<template>
  <section>
    <div class="mb-2 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-stone-700">{{ t('facturas.title') }}</h3>
      <BaseButton variant="secondary" @click="openNew">{{ t('facturas.add') }}</BaseButton>
    </div>

    <p v-if="facturas.length === 0" class="text-xs text-stone-400">{{ t('facturas.empty') }}</p>

    <ul v-else class="space-y-2">
      <li v-for="f in facturas" :key="f.id" class="rounded-xl border border-stone-200 bg-white p-3">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm font-medium">
              {{ f.numero ? `#${f.numero}` : t('facturas.noNumber') }}
              <span v-if="f.proveedor" class="font-normal text-stone-500"> · {{ f.proveedor }}</span>
            </p>
            <p class="text-xs text-stone-400">{{ f.fecha ?? '—' }}</p>
            <p v-if="f.notes" class="mt-1 text-xs text-stone-500">{{ f.notes }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold whitespace-nowrap">{{ formatMoney(f.montoMinor, f.moneda) }}</p>
            <div class="mt-1 flex justify-end gap-2 text-xs">
              <button type="button" class="text-brand-700 hover:underline" @click="openEdit(f)">
                {{ t('common.editar') }}
              </button>
              <button type="button" class="text-red-500 hover:underline" @click="remove(f)">
                {{ t('common.eliminar') }}
              </button>
            </div>
          </div>
        </div>
        <div class="mt-2 border-t border-stone-100 pt-2">
          <AttachmentsSection parent-type="factura" :parent-id="f.id" />
        </div>
      </li>
    </ul>

    <BaseModal
      :open="showForm"
      :title="editing ? t('facturas.editTitle') : t('facturas.newTitle')"
      @close="showForm = false"
    >
      <form class="space-y-4" @submit.prevent="save">
        <BaseInput v-model="form.numero" :label="t('facturas.numero')" />
        <div class="grid grid-cols-2 gap-3">
          <MoneyInput v-model="form.montoMinor" :label="t('common.monto')" />
          <BaseSelect v-model="form.moneda" :label="t('common.moneda')" :options="monedaOptions" />
        </div>
        <BaseInput v-model="form.proveedor" :label="t('facturas.proveedor')" />
        <BaseInput v-model="form.fecha" :label="t('common.fecha')" type="date" />
        <BaseTextarea v-model="form.notes" :label="t('common.notas')" />
        <BaseButton type="submit" block :disabled="saving">
          {{ saving ? t('common.cargando') : t('common.guardar') }}
        </BaseButton>
      </form>
    </BaseModal>
  </section>
</template>
