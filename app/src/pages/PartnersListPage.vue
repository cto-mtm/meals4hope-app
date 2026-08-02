<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ContactEditModal from '../components/ContactEditModal.vue'
import EmptyState from '../components/EmptyState.vue'
import QuickCreateContact from '../components/QuickCreateContact.vue'
import QuickCreatePartner from '../components/QuickCreatePartner.vue'
import { fetchAll } from '../lib/db'
import { useDirectoryStore } from '../stores/directory'
import type { Contact, Entrada } from '../types/models'

const { t } = useI18n()
const directory = useDirectoryStore()

const search = ref<string>('')
const loading = ref(true)
const editingContact = ref<Contact | null>(null)

/* Iniciativas linked per organization ("1 iniciativa vinculada"). */
const linkCount = ref<Map<string, number>>(new Map())

const filteredOrgs = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return directory.organizations
  return directory.organizations.filter((o) => o.name.toLowerCase().includes(q))
})

const filteredContacts = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return directory.contacts
  return directory.contacts.filter((c) => c.name.toLowerCase().includes(q))
})

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

const TYPE_TONES: Record<string, { avatar: string; pill: string }> = {
  organizador: { avatar: 'bg-leaf-100 text-leaf-700', pill: 'bg-leaf-100 text-leaf-700' },
  beneficiario: { avatar: 'bg-brand-50 text-brand-600', pill: 'bg-mist-100 text-ink-600' },
  ambos: { avatar: 'bg-brand-50 text-brand-600', pill: 'bg-mist-100 text-ink-600' },
}

onMounted(async () => {
  const [, iniciativas] = await Promise.all([directory.load(), fetchAll<Entrada>('entrada')])
  const counts = new Map<string, number>()
  for (const e of iniciativas) {
    if (e.organizadorId) counts.set(e.organizadorId, (counts.get(e.organizadorId) ?? 0) + 1)
  }
  linkCount.value = counts
  loading.value = false
})
</script>

<template>
  <div>
    <div class="mb-5 flex items-center justify-between">
      <h1 class="text-[22px] font-bold tracking-[-0.3px]">{{ t('partners.title') }}</h1>
      <QuickCreatePartner default-type="organizador" variant="button" />
    </div>

    <div class="relative mb-4">
      <svg class="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
      <input
        v-model="search"
        type="search"
        :placeholder="t('partners.searchPlaceholder')"
        class="w-full rounded-[11px] border border-line-200 bg-white py-2.5 pr-3.5 pl-9 text-[13px] placeholder:text-ink-400 focus:border-brand-600 focus:outline-none"
      />
    </div>

    <p v-if="loading" class="text-[13px] text-ink-400">{{ t('common.cargando') }}</p>
    <EmptyState v-else-if="filteredOrgs.length === 0" :message="t('partners.empty')" />

    <div v-else class="grid gap-3 sm:grid-cols-2">
      <RouterLink
        v-for="org in filteredOrgs"
        :key="org.id"
        :to="{ name: 'partner-detail', params: { id: org.id } }"
        class="flex items-center gap-3 rounded-card bg-white px-4.5 py-4 shadow-card transition-shadow hover:shadow-card-hover"
      >
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-extrabold"
          :class="TYPE_TONES[org.type]?.avatar ?? 'bg-mist-100 text-ink-600'"
        >
          {{ initials(org.name)[0] }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold">{{ org.name }}</p>
          <p class="text-xs text-ink-400">
            {{
              linkCount.get(org.id)
                ? t('partners.vinculadas', { n: linkCount.get(org.id) }, linkCount.get(org.id)!)
                : t('partners.sinIniciativas')
            }}
          </p>
        </div>
        <span
          class="rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap"
          :class="TYPE_TONES[org.type]?.pill ?? 'bg-mist-100 text-ink-600'"
        >
          {{ t(`partners.types.${org.type}`) }}
        </span>
      </RouterLink>
    </div>

    <!-- Contacts directory -->
    <div v-if="!loading">
      <div class="mt-7 mb-3 flex items-center justify-between">
        <h2 class="text-base font-bold">{{ t('contacts.title') }}</h2>
        <QuickCreateContact />
      </div>

      <EmptyState v-if="filteredContacts.length === 0" :message="t('contacts.empty')" />

      <div v-else class="overflow-hidden rounded-card bg-white shadow-card">
        <div
          v-for="(c, i) in filteredContacts"
          :key="c.id"
          class="flex items-center gap-3 px-4.5 py-3.5"
          :class="i < filteredContacts.length - 1 ? 'border-b border-line-100' : ''"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-600">
            {{ initials(c.name) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13.5px] font-bold">{{ c.name }}</p>
            <p class="truncate text-xs text-ink-400">
              {{ [c.metodoContacto, c.email, directory.orgName(c.organizationId) !== '—' ? directory.orgName(c.organizationId) : null].filter(Boolean).join(' · ') || '—' }}
            </p>
          </div>
          <button
            type="button"
            class="text-[12.5px] font-semibold text-brand-600 hover:underline"
            @click="editingContact = c"
          >
            {{ t('common.editar') }}
          </button>
        </div>
      </div>
    </div>

    <ContactEditModal :contact="editingContact" @close="editingContact = null" />
  </div>
</template>
