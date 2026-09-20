import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { auth, db, googleAuthProvider, isFirebaseConfigured } from '@/config/firebase'
import type { User, UserRole } from './auth.model'
import { normalizeRole } from './auth.model'

export interface IAuthRepository {
  getCurrentUser(): Promise<User | null>
  signInWithGoogle(preferredRole?: UserRole): Promise<User>
  signOut(): Promise<void>
  subscribeToAuthState(callback: (user: User | null) => void): () => void
  getUserFromFirestore(uid: string): Promise<User | null>
  saveUserToFirestore(user: User): Promise<void>
  ensureUserInFirestore(
    fbUser: {
      uid: string
      email?: string | null
      displayName?: string | null
      photoURL?: string | null
    },
    defaultRole?: UserRole
  ): Promise<User>
  updateUserRoleInFirestore(targetUid: string, newRole: UserRole): Promise<void>
  getAllUsersFromFirestore(): Promise<User[]>
}

class AuthRepository implements IAuthRepository {
  private fallbackUser: User | null = null
  private demoUsers: User[] = [
    {
      uid: 'usr_001',
      email: 'ahmad@koneksi.co.id',
      displayName: 'Ahmad Drafter',
      name: 'Ahmad Drafter',
      role: 'drafter',
      department: 'HR Operations',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
    {
      uid: 'usr_002',
      email: 'siti@koneksi.co.id',
      displayName: 'Siti Reviewer',
      name: 'Siti Reviewer',
      role: 'reviewer',
      department: 'HR Quality & Compliance',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
    {
      uid: 'usr_003',
      email: 'hendra@koneksi.co.id',
      displayName: 'Hendra Approver',
      name: 'Hendra Approver',
      role: 'approver',
      department: 'Head of Human Resources',
      signatureUrl: 'https://dummyimage.com/200x80/000/fff&text=Hendra+Signature',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
    {
      uid: 'usr_004',
      email: 'admin@koneksi.co.id',
      displayName: 'Admin Utama',
      name: 'Admin Utama',
      role: 'admin',
      department: 'IT Systems',
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ]

  async getUserFromFirestore(uid: string): Promise<User | null> {
    if (!isFirebaseConfigured) {
      if (this.fallbackUser && this.fallbackUser.uid === uid) {
        return this.fallbackUser
      }
      return this.demoUsers.find((u) => u.uid === uid) || null
    }

    try {
      const userRef = doc(db, 'users', uid)
      const docSnap = await getDoc(userRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        const displayName = data.displayName || data.name || 'Pengguna Koneksi'
        return {
          uid,
          email: data.email || '',
          displayName,
          name: displayName,
          role: (data.role as UserRole) || 'drafter',
          signatureUrl: data.signatureUrl || undefined,
          avatarUrl: data.avatarUrl || undefined,
          department: data.department || undefined,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
        }
      }
      return null
    } catch (err) {
      console.warn('Gagal membaca data Firestore collection users:', err)
      return null
    }
  }

  async saveUserToFirestore(user: User): Promise<void> {
    const displayName = user.displayName || user.name || 'Pengguna Koneksi'
    if (!isFirebaseConfigured) {
      const existingIdx = this.demoUsers.findIndex((u) => u.uid === user.uid)
      const userToSave: User = {
        ...user,
        displayName,
        name: displayName,
      }
      if (existingIdx >= 0) {
        this.demoUsers[existingIdx] = userToSave
      } else {
        this.demoUsers.push(userToSave)
      }
      if (this.fallbackUser?.uid === user.uid) {
        this.fallbackUser = userToSave
      }
      return
    }

    const userRef = doc(db, 'users', user.uid)
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email,
        displayName,
        name: displayName,
        role: user.role,
        avatarUrl: user.avatarUrl || null,
        signatureUrl: user.signatureUrl || null,
        department: user.department || null,
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )
  }

  async ensureUserInFirestore(
    fbUser: {
      uid: string
      email?: string | null
      displayName?: string | null
      photoURL?: string | null
    },
    defaultRole: UserRole = 'drafter'
  ): Promise<User> {
    // 1. Check if user document already exists in Firestore users collection
    const existing = await this.getUserFromFirestore(fbUser.uid)
    if (existing) {
      return existing
    }

    // 2. Automatically create user document in Firestore users collection upon first login
    const now = new Date().toISOString()
    const displayName = fbUser.displayName || 'Pengguna Koneksi'
    const newUser: User = {
      uid: fbUser.uid,
      email: fbUser.email || '',
      displayName,
      name: displayName,
      role: defaultRole,
      signatureUrl: undefined,
      avatarUrl: fbUser.photoURL || undefined,
      createdAt: now,
      updatedAt: now,
    }

    await this.saveUserToFirestore(newUser)
    return newUser
  }

  async updateUserRoleInFirestore(targetUid: string, newRole: UserRole): Promise<void> {
    if (!isFirebaseConfigured) {
      const demo = this.demoUsers.find((u) => u.uid === targetUid)
      if (demo) {
        demo.role = newRole
        demo.updatedAt = new Date().toISOString()
      }
      if (this.fallbackUser && this.fallbackUser.uid === targetUid) {
        this.fallbackUser.role = newRole
        this.fallbackUser.updatedAt = new Date().toISOString()
      }
      return
    }

    const userRef = doc(db, 'users', targetUid)
    await setDoc(
      userRef,
      {
        role: newRole,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )
  }

  async getAllUsersFromFirestore(): Promise<User[]> {
    if (!isFirebaseConfigured) {
      return [...this.demoUsers]
    }

    try {
      const colRef = collection(db, 'users')
      const snap = await getDocs(colRef)
      if (snap.empty) {
        return [...this.demoUsers]
      }
      return snap.docs.map((docSnap) => {
        const data = docSnap.data()
        const displayName = data.displayName || data.name || 'Pengguna Koneksi'
        return {
          uid: docSnap.id,
          email: data.email || '',
          displayName,
          name: displayName,
          role: (data.role as UserRole) || 'drafter',
          signatureUrl: data.signatureUrl || undefined,
          avatarUrl: data.avatarUrl || undefined,
          department: data.department || undefined,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
        }
      })
    } catch (err) {
      console.warn('Gagal membaca daftar pengguna dari Firestore collection users:', err)
      return [...this.demoUsers]
    }
  }

  private mapFirebaseUserToAppUser(fbUser: FirebaseUser, role: UserRole = 'drafter'): User {
    const displayName = fbUser.displayName || 'Pengguna Koneksi'
    return {
      uid: fbUser.uid,
      email: fbUser.email || '',
      displayName,
      name: displayName,
      role,
      avatarUrl: fbUser.photoURL || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!isFirebaseConfigured) {
      return this.fallbackUser
    }

    const currentFbUser = auth.currentUser
    if (!currentFbUser) {
      return null
    }

    const firestoreUser = await this.getUserFromFirestore(currentFbUser.uid)
    return firestoreUser || this.mapFirebaseUserToAppUser(currentFbUser)
  }

  async signInWithGoogle(preferredRole?: UserRole): Promise<User> {
    if (!isFirebaseConfigured) {
      // Fallback demo mode if .env is not yet configured
      await new Promise((resolve) => setTimeout(resolve, 300))
      const role = preferredRole || 'drafter'
      const mockUser: User = {
        uid: `usr_${Date.now()}`,
        email: `${role.toLowerCase()}@koneksi.co.id`,
        displayName: `${role.charAt(0).toUpperCase() + role.slice(1)} User (Demo)`,
        name: `${role.charAt(0).toUpperCase() + role.slice(1)} User (Demo)`,
        role,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`,
        signatureUrl: normalizeRole(role) === 'approver' ? 'https://dummyimage.com/200x80/000/fff&text=Signature' : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.fallbackUser = mockUser
      return mockUser
    }

    // Live Firebase Google Sign-In
    const result = await signInWithPopup(auth, googleAuthProvider)
    const fbUser = result.user

    // Automatically create or fetch user document from Firestore users collection
    const appUser = await this.ensureUserInFirestore(fbUser, preferredRole || 'drafter')
    return appUser
  }

  async signOut(): Promise<void> {
    if (isFirebaseConfigured) {
      await firebaseSignOut(auth)
    }
    this.fallbackUser = null
  }

  subscribeToAuthState(callback: (user: User | null) => void): () => void {
    if (!isFirebaseConfigured) {
      callback(this.fallbackUser)
      return () => {}
    }

    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        callback(null)
        return
      }

      try {
        // Automatically create in Firestore on first login or load database truth
        const appUser = await this.ensureUserInFirestore(fbUser)
        callback(appUser)
      } catch {
        callback(this.mapFirebaseUserToAppUser(fbUser))
      }
    })
  }
}

export const authRepository = new AuthRepository()

