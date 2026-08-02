<script setup lang="ts">
// Image/PDF gallery + upload for any parent (entrada, salida, factura).
// Uploads are compressed client-side (lib/storage.ts); deletes are soft.
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from './BaseButton.vue'
import BaseInput from './BaseInput.vue'
import BaseModal from './BaseModal.vue'
import { createEntity, fetchChildren, softDeleteEntity, updateEntity } from '../lib/db'
import { uploadAttachment } from '../lib/storage'
import type { Attachment, ParentType } from '../types/models'

const props = defineProps<{ parentType: ParentType; parentId: string }>()
const { t } = useI18n()

const attachments = ref<Attachment[]>([])
const uploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()

async function load() {
  attachments.value = await fetchChildren<Attachment>(
    'attachment',
    props.parentType,
    props.parentId
  )
}

async function onFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = true
  error.value = null
  try {
    for (const file of Array.from(files)) {
      const up = await uploadAttachment(file, props.parentType, props.parentId)
      await createEntity(
        'attachment',
        {
          parentType: props.parentType,
          parentId: props.parentId,
          fileUrl: up.fileUrl,
          storagePath: up.storagePath,
          contentType: up.contentType,
          caption: null,
        },
        file.name
      )
    }
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

/* ── Caption editing ─────────────────────────────────────────── */
const captionTarget = ref<Attachment | null>(null)
const captionText = ref<string | null>(null)
const savingCaption = ref(false)

function openCaption(a: Attachment) {
  captionTarget.value = a
  captionText.value = a.caption
}

async function saveCaption() {
  if (!captionTarget.value) return
  savingCaption.value = true
  try {
    const a = captionTarget.value
    await updateEntity(
      'attachment',
      a.id,
      { caption: captionText.value?.trim() || null },
      { caption: a.caption },
      captionText.value?.trim() || a.storagePath
    )
    captionTarget.value = null
    await load()
  } finally {
    savingCaption.value = false
  }
}

async function remove(a: Attachment) {
  if (!confirm(t('attachments.confirmDelete'))) return
  await softDeleteEntity('attachment', a.id, a.caption ?? a.storagePath)
  await load()
}

onMounted(load)
</script>

<template>
  <section>
    <div class="mb-2.5 flex items-center justify-between">
      <h3 class="text-[13.5px] font-bold">{{ t('attachments.title') }}</h3>
      <label
        class="cursor-pointer rounded-lg border border-line-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-mist-200"
      >
        ↑ {{ uploading ? t('common.cargando') : t('attachments.add') }}
        <input
          ref="fileInput"
          type="file"
          accept="image/*,.pdf"
          multiple
          class="hidden"
          :disabled="uploading"
          @change="onFiles"
        />
      </label>
    </div>

    <p v-if="error" class="mb-2 text-xs text-danger-600">{{ error }}</p>
    <p
      v-if="attachments.length === 0"
      class="rounded-[10px] border-[1.5px] border-dashed border-line-200 py-4 text-center text-[12.5px] text-ink-400"
    >
      {{ t('attachments.empty') }}
    </p>

    <div v-else class="grid grid-cols-3 gap-2 sm:grid-cols-4">
      <div v-for="a in attachments" :key="a.id" class="group relative">
        <a :href="a.fileUrl" target="_blank" rel="noopener">
          <img
            v-if="a.contentType.startsWith('image/')"
            :src="a.fileUrl"
            :alt="a.caption ?? ''"
            class="aspect-square w-full rounded-lg border border-stone-200 object-cover"
            loading="lazy"
          />
          <div
            v-else
            class="flex aspect-square w-full items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-xs font-semibold text-stone-500"
          >
            PDF
          </div>
        </a>
        <button
          type="button"
          class="absolute top-1 right-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
          @click="remove(a)"
        >
          ✕
        </button>
        <button
          type="button"
          class="mt-0.5 block w-full truncate text-left text-[11px] text-stone-400 hover:text-brand-700"
          :title="t('attachments.editCaption')"
          @click="openCaption(a)"
        >
          {{ a.caption ?? t('attachments.addCaption') }}
        </button>
      </div>
    </div>

    <BaseModal
      :open="captionTarget !== null"
      :title="t('attachments.captionTitle')"
      @close="captionTarget = null"
    >
      <form class="space-y-4" @submit.prevent="saveCaption">
        <BaseInput v-model="captionText" :label="t('attachments.captionLabel')" />
        <BaseButton type="submit" block :disabled="savingCaption">
          {{ savingCaption ? t('common.cargando') : t('common.guardar') }}
        </BaseButton>
      </form>
    </BaseModal>
  </section>
</template>
