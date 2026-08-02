<script setup lang="ts">
// Inline Team Member creation from the Iniciativa form — the gestora is
// pure data (no login account), so name is all that's required.
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from './BaseButton.vue'
import BaseInput from './BaseInput.vue'
import BaseModal from './BaseModal.vue'
import { useDirectoryStore } from '../stores/directory'

const emit = defineEmits<{ created: [id: string] }>()
const { t } = useI18n()
const directory = useDirectoryStore()

const open = ref(false)
const name = ref<string | null>(null)
const email = ref<string | null>(null)
const saving = ref(false)

async function save() {
  if (!name.value?.trim()) return
  saving.value = true
  try {
    const id = await directory.quickCreateTeamMember(name.value.trim(), email.value?.trim() || null)
    emit('created', id)
    open.value = false
    name.value = null
    email.value = null
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <button type="button" class="text-xs font-semibold text-brand-600 hover:underline" @click="open = true">
    + {{ t('team.quickCreate') }}
  </button>

  <BaseModal :open="open" :title="t('team.quickCreate')" @close="open = false">
    <form class="space-y-4" @submit.prevent="save">
      <BaseInput v-model="name" :label="t('team.name')" required />
      <BaseInput v-model="email" :label="t('team.email')" type="email" :hint="t('team.emailHint')" />
      <BaseButton type="submit" block :disabled="saving">
        {{ saving ? t('common.cargando') : t('common.crear') }}
      </BaseButton>
    </form>
  </BaseModal>
</template>
