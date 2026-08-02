<script setup lang="ts">
// Full edit form for a Contact (quick-create only covers name/método/org).
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from './BaseButton.vue'
import BaseInput from './BaseInput.vue'
import BaseModal from './BaseModal.vue'
import BaseSelect from './BaseSelect.vue'
import BaseTextarea from './BaseTextarea.vue'
import { useDirectoryStore } from '../stores/directory'
import type { Contact } from '../types/models'

const props = defineProps<{ contact: Contact | null }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const directory = useDirectoryStore()

const form = ref({
  name: null as string | null,
  metodoContacto: null as string | null,
  email: null as string | null,
  organizationId: null as string | null,
  notes: null as string | null,
})
const saving = ref(false)

watch(
  () => props.contact,
  (c) => {
    if (c) {
      form.value = {
        name: c.name,
        metodoContacto: c.metodoContacto,
        email: c.email,
        organizationId: c.organizationId,
        notes: c.notes,
      }
    }
  },
  { immediate: true }
)

async function save() {
  if (!props.contact || !form.value.name?.trim()) return
  saving.value = true
  try {
    await directory.updateContact(props.contact, {
      name: form.value.name.trim(),
      metodoContacto: form.value.metodoContacto,
      email: form.value.email,
      organizationId: form.value.organizationId,
      notes: form.value.notes,
    })
    emit('close')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal :open="contact !== null" :title="t('contacts.editTitle')" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="save">
      <BaseInput v-model="form.name" :label="t('contacts.name')" required />
      <BaseInput
        v-model="form.metodoContacto"
        :label="t('contacts.metodoContacto')"
        :placeholder="t('contacts.metodoPlaceholder')"
      />
      <BaseInput v-model="form.email" :label="t('contacts.email')" type="email" />
      <BaseSelect
        v-model="form.organizationId"
        :label="t('contacts.organization')"
        allow-empty
        :options="directory.organizations.map((o) => ({ value: o.id, label: o.name }))"
      />
      <BaseTextarea v-model="form.notes" :label="t('common.notas')" />
      <BaseButton type="submit" block :disabled="saving">
        {{ saving ? t('common.cargando') : t('common.guardar') }}
      </BaseButton>
    </form>
  </BaseModal>
</template>
