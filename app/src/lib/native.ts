import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import type { Router } from 'vue-router'

/**
 * Native-shell integrations. Without the back-button listener, the Android
 * hardware/gesture back button closes the app from ANY page instead of
 * navigating back. No-op in the browser.
 */
export function registerNative(router: Router): void {
  if (!Capacitor.isNativePlatform()) return

  App.addListener('backButton', () => {
    if (window.history.state?.back) {
      router.back()
    } else {
      App.exitApp()
    }
  })
}
