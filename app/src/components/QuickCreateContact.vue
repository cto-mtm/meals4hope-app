<script setup lang="ts">
// Inline Contact creation from the Entrada/Salida forms.
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from './BaseButton.vue'
import BaseInput from './BaseInput.vue'
import BaseModal from './BaseModal.vue'
import BaseSelect from './BaseSelect.vue'
import { useDirectoryStore } from '../stores/directory'

const emit = defineEmits<{ created: [id: string] }>()
const { t } = useI18n()
const directory = useDirectoryStore()

const open = ref(false)
const name = ref<string | null>(null)
const phone = ref<string | null>(null)
const orgId = ref<string | null>(null)
const saving = ref(false)

async function save() {
  if (!name.value?.trim()) return
  saving.value = true
  try {
    const id = await directory.quickCreateContact(name.value.trim(), phone.value, orgId.value)
    emit('created', id)
    open.value = false
    name.value = null
    phone.value = null
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <button type="button" class="text-xs font-medium text-brand-700 hover:underline" @click="open = true">
    + {{ t('contacts.quickCreate') }}
  </button>

  <BaseModal :open="open" :title="t('contacts.quickCreate')" @close="open = false">
    <form class="space-y-4" @submit.prevent="save">
      <BaseInput v-model="name" :label="t('contacts.name')" required />
      <BaseInput v-model="phone" :label="t('contacts.phone')" type="tel" />
      <BaseSelect
        v-model="orgId"
        :label="t('contacts.organization')"
        allow-empty
        :options="directory.organizations.map((o) => ({ value: o.id, label: o.name }))"
      />
      <BaseButton type="submit" block :disabled="saving">
        {{ saving ? t('common.cargando') : t('common.crear') }}
      </BaseButton>
    </form>
  </BaseModal>
</template>
