import { createI18n } from 'vue-i18n'

import common from './locales/configs/common'
import shell from './locales/components/shell'
import facturas from './locales/components/facturas'
import attachments from './locales/components/attachments'
import audit from './locales/components/audit'
import contacts from './locales/components/contacts'
import team from './locales/components/team'
import login from './locales/pages/login'
import dashboard from './locales/pages/dashboard'
import iniciativas from './locales/pages/iniciativas'
import salidas from './locales/pages/salidas'
import partners from './locales/pages/partners'
import admin from './locales/pages/admin'
import notFound from './locales/pages/notFound'
import settings from './locales/pages/settings'

export const SUPPORTED_LOCALES = ['es', 'en'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_STORAGE_KEY = 'm4h-locale'

/** es unless the user picked a locale before (Settings page persists it). */
function initialLocale(): SupportedLocale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) {
      return saved as SupportedLocale
    }
  } catch {
    /* private mode etc. */
  }
  return 'es'
}

// es is the primary authored locale (source of truth); en is the fallback.
// Each module exports { es, en } with en typed `typeof es` — key parity is
// enforced at compile time. Adding a namespace = one line in each block.
const messages = {
  es: {
    common: common.es,
    shell: shell.es,
    facturas: facturas.es,
    attachments: attachments.es,
    audit: audit.es,
    contacts: contacts.es,
    team: team.es,
    login: login.es,
    dashboard: dashboard.es,
    iniciativas: iniciativas.es,
    salidas: salidas.es,
    partners: partners.es,
    admin: admin.es,
    notFound: notFound.es,
    settings: settings.es,
  },
  en: {
    common: common.en,
    shell: shell.en,
    facturas: facturas.en,
    attachments: attachments.en,
    audit: audit.en,
    contacts: contacts.en,
    team: team.en,
    login: login.en,
    dashboard: dashboard.en,
    iniciativas: iniciativas.en,
    salidas: salidas.en,
    partners: partners.en,
    admin: admin.en,
    notFound: notFound.en,
    settings: settings.en,
  },
}

export type MessageSchema = (typeof messages)['es']

// Key autocompletion in t() calls across the app.
declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends MessageSchema {}
}

// Dates: stored UTC, rendered local. Always use d(date, '<format>') — never
// hand-format. 'short' = timestamps; 'day' = date-only fields ("10 jul 2026");
// 'full' = page headers ("domingo, 20 de julio de 2026"); 'month'/'dayOfMonth'
// feed the calendar badges on the dashboard.
type DateFormatKeys = 'short' | 'day' | 'full' | 'month' | 'dayOfMonth'
const datetimeFormats: Record<SupportedLocale, Record<DateFormatKeys, Intl.DateTimeFormatOptions>> = {
  es: {
    short: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
    day: { day: 'numeric', month: 'short', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    month: { month: 'short' },
    dayOfMonth: { day: 'numeric' },
  },
  en: {
    short: {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
    day: { month: 'short', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    month: { month: 'short' },
    dayOfMonth: { day: 'numeric' },
  },
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages,
  datetimeFormats,
})
