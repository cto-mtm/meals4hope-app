<script setup lang="ts">
// Inline Organization creation from the Entrada/Salida forms — users
// should never have to navigate away mid-form.
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from './BaseButton.vue'
import BaseInput from './BaseInput.vue'
import BaseModal from './BaseModal.vue'
import BaseSelect from './BaseSelect.vue'
import { useDirectoryStore } from '../stores/directory'
import { ORG_TYPES, type OrgType } from '../types/models'

const props = withDefaults(
  defineProps<{
    defaultType: OrgType
    /** 'link' = inline text trigger (inside forms); 'button' = solid CTA. */
    variant?: 'link' | 'button'
  }>(),
  { variant: 'link' }
)
const emit = defineEmits<{ created: [id: string] }>()
const { t } = useI18n()
const directory = useDirectoryStore()

const open = ref(false)
const name = ref<string | null>(null)
const type = ref<OrgType>(props.defaultType)
const saving = ref(false)

async function save() {
  if (!name.value?.trim()) return
  saving.value = true
  try {
    const id = await directory.quickCreateOrg(name.value.trim(), type.value)
    emit('created', id)
    open.value = false
    name.value = null
  } finally {
    saving.value = false
  }
}

const typeOptions = ORG_TYPES.map((v) => ({ value: v, label: t(`partners.types.${v}`) }))
</script>

<template>
  <button
    v-if="props.variant === 'button'"
    type="button"
    class="rounded-[9px] bg-brand-600 px-4 py-2 text-[13px] font-semibold whitespace-nowrap text-white hover:bg-brand-700"
    @click="open = true"
  >
    + {{ t('partners.quickCreate') }}
  </button>
  <button v-else type="button" class="text-xs font-semibold text-brand-600 hover:underline" @click="open = true">
    + {{ t('partners.quickCreate') }}
  </button>

  <BaseModal :open="open" :title="t('partners.quickCreate')" @close="open = false">
    <form class="space-y-4" @submit.prevent="save">
      <BaseInput v-model="name" :label="t('partners.name')" required />
      <BaseSelect v-model="type" :label="t('partners.type')" :options="typeOptions" />
      <BaseButton type="submit" block :disabled="saving">
        {{ saving ? t('common.cargando') : t('common.crear') }}
      </BaseButton>
    </form>
  </BaseModal>
</template>
