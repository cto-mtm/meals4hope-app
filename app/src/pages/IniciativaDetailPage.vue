<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AttachmentsSection from '../components/AttachmentsSection.vue'
import EstadoChip from '../components/EstadoChip.vue'
import HistoryList from '../components/HistoryList.vue'
import { fetchById, softDeleteEntity, updateEntity } from '../lib/db'
import { parseDateOnly } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { uploadAttachment } from '../lib/storage'
import { useDirectoryStore } from '../stores/directory'
import { CERTIFICADO_ESTADOS, type CertificadoEstado, type Entrada } from '../types/models'

const { t, d } = useI18n()
const route = useRoute()
const router = useRouter()
const directory = useDirectoryStore()

const id = route.params.id as string
const iniciativa = ref<Entrada | null>(null)
const loading = ref(true)

const metaLine = computed(() => {
  const e = iniciativa.value
  if (!e) return ''
  const parts: string[] = []
  if (e.fechaInicio) {
    const inicio = parseDateOnly(e.fechaInicio)
    if (e.fechaFin && e.fechaFin !== e.fechaInicio) {
      const fin = parseDateOnly(e.fechaFin)
      const sameMonth =
        inicio.getMonth() === fin.getMonth() && inicio.getFullYear() === fin.getFullYear()
      parts.push(
        sameMonth
          ? `${d(inicio, 'dayOfMonth')} – ${d(fin, 'day')}`
          : `${d(inicio, 'day')} – ${d(fin, 'day')}`
      )
    } else {
      parts.push(d(inicio, 'day'))
    }
  } else {
    parts.push(t('iniciativas.sinFecha'))
  }
  parts.push(
    e.organizadorId ? directory.orgName(e.organizadorId) : t('iniciativas.sinOrganizador')
  )
  if (e.donde) parts.push(e.donde)
  return parts.join(' · ')
})

async function remove() {
  if (!iniciativa.value || !confirm(t('iniciativas.confirmDelete'))) return
  await softDeleteEntity('entrada', id, iniciativa.value.nombreIniciativa)
  router.push({ name: 'iniciativas' })
}

/* ── Certificado section ─────────────────────────────────────── */
const savingCert = ref(false)
const certError = ref<string | null>(null)
const certFileInput = ref<HTMLInputElement>()

async function setCertEstado(value: CertificadoEstado) {
  const e = iniciativa.value
  if (!e || e.certificado === value) return
  savingCert.value = true
  try {
    await updateEntity('entrada', id, { certificado: value }, { certificado: e.certificado }, e.nombreIniciativa)
    e.certificado = value
  } finally {
    savingCert.value = false
  }
}

async function onCertFile(ev: Event) {
  const e = iniciativa.value
  const file = (ev.target as HTMLInputElement).files?.[0]
  if (!e || !file) return
  savingCert.value = true
  certError.value = null
  try {
    const up = await uploadAttachment(file, 'entrada', id)
    await updateEntity(
      'entrada',
      id,
      { certificadoImagenUrl: up.fileUrl, certificadoImagenPath: up.storagePath },
      {
        certificadoImagenUrl: e.certificadoImagenUrl ?? null,
        certificadoImagenPath: e.certificadoImagenPath ?? null,
      },
      e.nombreIniciativa
    )
    e.certificadoImagenUrl = up.fileUrl
    e.certificadoImagenPath = up.storagePath
  } catch (err) {
    certError.value = err instanceof Error ? err.message : String(err)
  } finally {
    savingCert.value = false
    if (certFileInput.value) certFileInput.value.value = ''
  }
}

async function removeCertImage() {
  const e = iniciativa.value
  if (!e || !confirm(t('iniciativas.certConfirmQuitar'))) return
  savingCert.value = true
  try {
    await updateEntity(
      'entrada',
      id,
      { certificadoImagenUrl: null, certificadoImagenPath: null },
      {
        certificadoImagenUrl: e.certificadoImagenUrl ?? null,
        certificadoImagenPath: e.certificadoImagenPath ?? null,
      },
      e.nombreIniciativa
    )
    e.certificadoImagenUrl = null
    e.certificadoImagenPath = null
  } finally {
    savingCert.value = false
  }
}

onMounted(async () => {
  await directory.load()
  iniciativa.value = await fetchById<Entrada>('entrada', id)
  loading.value = false
})
</script>

<template>
  <p v-if="loading" class="text-[13px] text-ink-400">{{ t('common.cargando') }}</p>
  <p v-else-if="!iniciativa" class="text-[13px] text-ink-400">{{ t('common.noEncontrado') }}</p>

  <div v-else>
    <RouterLink :to="{ name: 'iniciativas' }" class="mb-3.5 inline-block text-[12.5px] font-semibold text-brand-600">
      ← {{ t('iniciativas.backToList') }}
    </RouterLink>

    <!-- HERO TARGET: same view-transition-name as the list card -->
    <header
      class="rounded-card bg-white px-6 py-6 shadow-card"
      :style="{ viewTransitionName: 'iniciativa-' + iniciativa.id }"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2.5">
            <h1 class="text-[21px] font-extrabold tracking-[-0.3px]">{{ iniciativa.nombreIniciativa }}</h1>
            <EstadoChip :value="iniciativa.estado" />
          </div>
          <p class="mt-1.5 text-[13px] text-ink-500">{{ metaLine }}</p>
          <div class="mt-3.5 flex flex-wrap gap-2">
            <span
              class="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
              :class="iniciativa.donaron ? 'bg-leaf-100 text-leaf-700' : 'bg-mist-100 text-ink-600'"
            >
              {{ iniciativa.donaron ? t('iniciativas.donaronSi') : t('iniciativas.donaronNo') }}
            </span>
            <span
              v-if="iniciativa.certificado !== 'no_aplica'"
              class="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
              :class="iniciativa.certificado === 'enviado' ? 'bg-leaf-100 text-leaf-700' : 'bg-sun-100 text-sun-700'"
            >
              {{ iniciativa.certificado === 'enviado' ? t('iniciativas.certificadoEnviado') : t('iniciativas.certificadoPendiente') }}
            </span>
            <span
              class="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
              :class="iniciativa.graciasEnviado ? 'bg-leaf-100 text-leaf-700' : 'bg-sun-100 text-sun-700'"
            >
              {{ iniciativa.graciasEnviado ? t('iniciativas.graciasEnviado') : t('iniciativas.graciasPendiente') }}
            </span>
            <span
              class="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
              :class="iniciativa.promocionadoInstagram ? 'bg-leaf-100 text-leaf-700' : 'bg-mist-100 text-ink-600'"
            >
              {{ iniciativa.promocionadoInstagram ? '✓ ' + t('iniciativas.igSi') : t('iniciativas.igNo') }}
            </span>
          </div>
        </div>
        <div class="flex shrink-0 gap-2">
          <RouterLink :to="{ name: 'iniciativa-edit', params: { id: iniciativa.id } }">
            <button type="button" class="rounded-[9px] border border-line-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold hover:bg-mist-200">
              {{ t('common.editar') }}
            </button>
          </RouterLink>
          <button
            type="button"
            class="rounded-[9px] border border-danger-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-danger-600 hover:bg-red-50"
            @click="remove"
          >
            {{ t('common.eliminar') }}
          </button>
        </div>
      </div>
    </header>

    <div class="mt-4 grid items-start gap-4 lg:grid-cols-[2fr_1fr]">
      <!-- Left column -->
      <div class="flex flex-col gap-4">
        <!-- Detalles -->
        <section class="rounded-card bg-white px-5 py-5 shadow-card">
          <h2 class="mb-3.5 text-[13.5px] font-bold">{{ t('iniciativas.detalles') }}</h2>
          <dl class="grid grid-cols-1 gap-x-6 gap-y-4 text-[13px] sm:grid-cols-2">
            <div>
              <dt class="mb-1 text-[11px] font-bold tracking-[0.5px] text-ink-400 uppercase">{{ t('iniciativas.donde') }}</dt>
              <dd :class="iniciativa.donde ? 'font-semibold' : 'text-ink-400'">{{ iniciativa.donde ?? '—' }}</dd>
            </div>
            <div>
              <dt class="mb-1 text-[11px] font-bold tracking-[0.5px] text-ink-400 uppercase">{{ t('common.contactoExterno') }}</dt>
              <dd :class="iniciativa.contactoExternoId ? 'font-semibold' : 'text-ink-400'">
                {{ directory.contactName(iniciativa.contactoExternoId) }}
              </dd>
            </div>
            <div>
              <dt class="mb-1 text-[11px] font-bold tracking-[0.5px] text-ink-400 uppercase">{{ t('iniciativas.medioDonacion') }}</dt>
              <dd :class="iniciativa.medioDonacion ? 'font-semibold' : 'text-ink-400'">
                {{ iniciativa.medioDonacion ?? '—' }}
              </dd>
            </div>
            <div>
              <dt class="mb-1 text-[11px] font-bold tracking-[0.5px] text-ink-400 uppercase">{{ t('common.contactoM4h') }}</dt>
              <dd v-if="iniciativa.contactoM4hId" class="flex items-center gap-2">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-[9px] font-bold text-brand-600">
                  {{ directory.teamMemberName(iniciativa.contactoM4hId)[0]?.toUpperCase() }}
                </span>
                <span class="font-semibold">{{ directory.teamMemberName(iniciativa.contactoM4hId) }}</span>
              </dd>
              <dd v-else class="text-ink-400">—</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="mb-1 text-[11px] font-bold tracking-[0.5px] text-ink-400 uppercase">{{ t('common.descripcion') }}</dt>
              <dd class="leading-relaxed whitespace-pre-wrap" :class="iniciativa.descripcion ? '' : 'text-ink-400'">
                {{ iniciativa.descripcion ?? '—' }}
              </dd>
            </div>
          </dl>
        </section>

        <!-- Certificado de donación -->
        <section class="rounded-card bg-white px-5 py-5 shadow-card">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-[13.5px] font-bold">{{ t('iniciativas.certSectionTitle') }}</h2>
            <select
              :value="iniciativa.certificado"
              :disabled="savingCert"
              class="rounded-[9px] border border-line-200 bg-white px-2.5 py-1.5 text-[12.5px] text-ink-600 focus:border-brand-600 focus:outline-none"
              @change="setCertEstado(($event.target as HTMLSelectElement).value as CertificadoEstado)"
            >
              <option v-for="c in CERTIFICADO_ESTADOS" :key="c" :value="c">{{ t(`common.estados.${c}`) }}</option>
            </select>
          </div>

          <p v-if="certError" class="mb-2 text-xs text-danger-600">{{ certError }}</p>

          <div v-if="iniciativa.certificadoImagenUrl" class="space-y-2.5">
            <a :href="iniciativa.certificadoImagenUrl" target="_blank" rel="noopener" class="block">
              <img
                :src="iniciativa.certificadoImagenUrl"
                :alt="t('iniciativas.certImagenAlt')"
                class="max-h-72 w-auto rounded-[10px] border border-line-200 object-contain"
                loading="lazy"
              />
            </a>
            <div class="flex gap-2">
              <label class="cursor-pointer rounded-lg border border-line-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-mist-200">
                {{ savingCert ? t('common.cargando') : t('iniciativas.certReemplazar') }}
                <input ref="certFileInput" type="file" accept="image/*" class="hidden" :disabled="savingCert" @change="onCertFile" />
              </label>
              <button
                type="button"
                class="rounded-lg border border-danger-200 bg-white px-3 py-1.5 text-xs font-semibold text-danger-600 hover:bg-red-50"
                :disabled="savingCert"
                @click="removeCertImage"
              >
                {{ t('iniciativas.certQuitar') }}
              </button>
            </div>
          </div>

          <div
            v-else
            class="flex flex-col items-center gap-2.5 rounded-[10px] border-[1.5px] border-dashed border-line-200 px-4 py-6 text-center"
          >
            <p class="text-[12.5px] text-ink-400">{{ t('iniciativas.certSinImagen') }}</p>
            <p class="text-[11.5px] text-ink-400">{{ t('iniciativas.certImagenHint') }}</p>
            <label class="cursor-pointer rounded-lg border border-line-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-mist-200">
              ↑ {{ savingCert ? t('common.cargando') : t('iniciativas.certSubirImagen') }}
              <input ref="certFileInput" type="file" accept="image/*" class="hidden" :disabled="savingCert" @change="onCertFile" />
            </label>
          </div>
        </section>

        <!-- Imágenes y documentos -->
        <section class="rounded-card bg-white px-5 py-5 shadow-card">
          <AttachmentsSection parent-type="entrada" :parent-id="iniciativa.id" />
        </section>
      </div>

      <!-- Right column -->
      <div class="flex flex-col gap-4">
        <div class="rounded-card bg-navy-900 px-5 py-5 text-white">
          <p class="text-xs font-semibold text-white/65">{{ t('iniciativas.donacion') }}</p>
          <template v-if="iniciativa.donaron">
            <p class="mt-2 text-[28px] font-extrabold tracking-[-0.6px] tabular-nums">
              {{ formatMoney(iniciativa.cantidadRecibidaMinor, iniciativa.moneda) }}
            </p>
            <p class="mt-1 text-[11.5px] text-white/55">{{ t('iniciativas.donaronSi') }}</p>
          </template>
          <template v-else>
            <p class="mt-2 text-[28px] font-extrabold text-white/45">—</p>
            <p class="mt-1 text-[11.5px] text-white/55">{{ t('iniciativas.aunNoRegistrada') }}</p>
            <RouterLink :to="{ name: 'iniciativa-edit', params: { id: iniciativa.id } }" class="mt-3.5 block">
              <button type="button" class="w-full rounded-[9px] bg-leaf-500 py-2.5 text-[12.5px] font-bold text-leaf-900 hover:brightness-105">
                {{ t('iniciativas.registrarDonacion') }}
              </button>
            </RouterLink>
          </template>
        </div>

        <section class="rounded-card bg-white px-5 py-5 shadow-card">
          <HistoryList entity-type="entrada" :entity-id="iniciativa.id" />
        </section>
      </div>
    </div>
  </div>
</template>
