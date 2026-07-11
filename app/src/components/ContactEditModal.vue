<script setup lang="ts">
// Full edit form for a Contact (quick-create only covers name/phone/org).
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
  phone: null as string | null,
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
        phone: c.phone,
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
      phone: form.value.phone,
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
      <BaseInput v-model="form.phone" :label="t('contacts.phone')" type="tel" />
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
