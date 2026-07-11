// Open Sans (the meals4hope.org typeface), self-hosted so it works
// offline and inside the iOS/Android shells — no runtime Google Fonts.
import '@fontsource/open-sans/400.css'
import '@fontsource/open-sans/600.css'
import '@fontsource/open-sans/700.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { registerNative } from './lib/native'
import { useAuthStore } from './stores/auth'
import './assets/css/main.css'
import './assets/css/transitions.css'

const app = createApp(App)
app.use(createPinia())

// Resolve the first auth state BEFORE mounting the router so guards
// never see a false "signed out" flash on refresh.
const auth = useAuthStore()
auth.init().then(() => {
  app.use(router)
  app.use(i18n)
  registerNative(router)
  app.mount('#app')
})
