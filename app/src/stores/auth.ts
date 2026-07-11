import { defineStore } from 'pinia'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { User } from '../types/models'

interface State {
  /** M4H member profile (users/{uid}) — null when signed out. */
  user: User | null
  /** True until the first onAuthStateChanged fires (router waits on this). */
  initializing: boolean
}

async function loadProfile(fbUser: FirebaseUser): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', fbUser.uid))
  if (!snap.exists()) return null
  const data = snap.data()
  if (data.activo !== true) return null // deactivated members can't use the app
  return { id: fbUser.uid, name: data.name, email: data.email, role: data.role, activo: true }
}

export const useAuthStore = defineStore('auth', {
  state: (): State => ({ user: null, initializing: true }),
  getters: {
    isAuthenticated: (s) => s.user !== null,
    isAdmin: (s) => s.user?.role === 'admin',
  },
  actions: {
    /** Called once from main.ts. Resolves after the first auth state event. */
    init(): Promise<void> {
      return new Promise((resolve) => {
        onAuthStateChanged(auth, async (fbUser) => {
          this.user = fbUser ? await loadProfile(fbUser) : null
          if (this.initializing) {
            this.initializing = false
            resolve()
          }
        })
      })
    },
    async login(email: string, password: string): Promise<void> {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      this.user = await loadProfile(cred.user)
      if (!this.user) {
        await signOut(auth)
        throw new Error('inactive')
      }
    },
    /**
     * Google sign-in for provisioned members. No public signup: with
     * Firebase's default one-account-per-email, a member created by an
     * admin keeps the same uid when they first sign in with Google. A
     * Google account whose email was never provisioned has no users/{uid}
     * doc → rejected ('not-member').
     *
     * Note: signInWithPopup is web-only. Inside the Capacitor shells this
     * needs a native plugin (e.g. @capacitor-firebase/authentication) —
     * email/password keeps working there meanwhile.
     */
    async loginWithGoogle(): Promise<void> {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider())
      this.user = await loadProfile(cred.user)
      if (!this.user) {
        await signOut(auth)
        throw new Error('not-member')
      }
    },
    async logout(): Promise<void> {
      await signOut(auth)
      this.user = null
    },
  },
})
