import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

// Local dev runs fully offline against the Emulator Suite under the
// `demo-meals4hope` project id — dummy config values are fine there.
const useEmulators =
  import.meta.env.VITE_USE_EMULATORS === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === undefined)

const firebaseConfig = useEmulators
  ? {
      apiKey: 'demo-key',
      authDomain: 'demo-meals4hope.firebaseapp.com',
      projectId: 'demo-meals4hope',
      storageBucket: 'demo-meals4hope.appspot.com',
      appId: 'demo-app-id',
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
// Persistent local cache (IndexedDB): volunteers at events with bad signal
// get cached reads + queued writes that sync when connectivity returns —
// and survive an app restart. Multi-tab safe.
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
export const storage = getStorage(firebaseApp)

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}
