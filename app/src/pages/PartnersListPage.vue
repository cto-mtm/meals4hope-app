<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseInput from '../components/BaseInput.vue'
import ContactEditModal from '../components/ContactEditModal.vue'
import EmptyState from '../components/EmptyState.vue'
import QuickCreateContact from '../components/QuickCreateContact.vue'
import QuickCreatePartner from '../components/QuickCreatePartner.vue'
import { useDirectoryStore } from '../stores/directory'
import type { Contact } from '../types/models'

const { t } = useI18n()
const directory = useDirectoryStore()

const search = ref<string | null>(null)
const loading = ref(true)
const editingContact = ref<Contact | null>(null)

const filteredOrgs = computed(() => {
  const q = search.value?.toLowerCase().trim()
  if (!q) return directory.organizations
  return directory.organizations.filter((o) => o.name.toLowerCase().includes(q))
})

const filteredContacts = computed(() => {
  const q = search.value?.toLowerCase().trim()
  if (!q) return directory.contacts
  return directory.contacts.filter((c) => c.name.toLowerCase().includes(q))
})

onMounted(async () => {
  await directory.load()
  loading.value = false
})
</script>

<template>
  <div class="space-y-8">
    <div>
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-xl font-bold">{{ t('partners.title') }}</h1>
        <QuickCreatePartner default-type="organizador" />
      </div>

      <div class="mb-4">
        <BaseInput v-model="search" :placeholder="t('common.buscar')" />
      </div>

      <p v-if="loading" class="text-sm text-stone-400">{{ t('common.cargando') }}</p>
      <EmptyState v-else-if="filteredOrgs.length === 0" :message="t('partners.empty')" />

      <ul v-else class="space-y-2">
        <li v-for="org in filteredOrgs" :key="org.id">
          <RouterLink
            :to="{ name: 'partner-detail', params: { id: org.id } }"
            class="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            <span class="text-sm font-semibold">{{ org.name }}</span>
            <span class="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
              {{ t(`partners.types.${org.type}`) }}
            </span>
          </RouterLink>
        </li>
      </ul>
    </div>

    <!-- Contacts directory -->
    <div v-if="!loading">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-semibold text-stone-700">{{ t('contacts.title') }}</h2>
        <QuickCreateContact />
      </div>

      <EmptyState v-if="filteredContacts.length === 0" :message="t('contacts.empty')" />

      <ul v-else class="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <li v-for="c in filteredContacts" :key="c.id" class="flex items-center gap-3 px-4 py-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ c.name }}</p>
            <p class="truncate text-xs text-stone-400">
              {{ [c.phone, c.email, directory.orgName(c.organizationId) !== '—' ? directory.orgName(c.organizationId) : null].filter(Boolean).join(' · ') || '—' }}
            </p>
          </div>
          <button
            type="button"
            class="text-xs font-medium text-brand-700 hover:underline"
            @click="editingContact = c"
          >
            {{ t('common.editar') }}
          </button>
        </li>
      </ul>
    </div>

    <ContactEditModal :contact="editingContact" @close="editingContact = null" />
  </div>
</template>
