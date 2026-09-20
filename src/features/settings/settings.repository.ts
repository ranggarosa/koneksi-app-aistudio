import type { ManagedUser, UserProfileSettings } from './settings.model'
import type { UserRole } from '@/features/auth/auth.model'
import { authRepository } from '@/features/auth/auth.repository'
import { isFirebaseConfigured } from '@/config/firebase'

export interface ISettingsRepository {
  getManagedUsers(): Promise<ManagedUser[]>
  updateUserRole(uid: string, newRole: UserRole): Promise<ManagedUser>
  updateSignature(uid: string, signatureUrl: string): Promise<UserProfileSettings>
}

class SettingsRepository implements ISettingsRepository {
  private users: ManagedUser[] = [
    {
      uid: 'usr_001',
      name: 'Ahmad Drafter',
      email: 'ahmad@koneksi.co.id',
      role: 'drafter',
      department: 'HR Operations',
      updatedAt: '2026-09-01T08:00:00Z',
    },
    {
      uid: 'usr_002',
      name: 'Siti Reviewer',
      email: 'siti@koneksi.co.id',
      role: 'reviewer',
      department: 'HR Quality & Compliance',
      updatedAt: '2026-09-01T08:00:00Z',
    },
    {
      uid: 'usr_003',
      name: 'Hendra Approver',
      email: 'hendra@koneksi.co.id',
      role: 'approver',
      department: 'Head of Human Resources',
      updatedAt: '2026-09-01T08:00:00Z',
    },
    {
      uid: 'usr_004',
      name: 'Admin Utama',
      email: 'admin@koneksi.co.id',
      role: 'admin',
      department: 'IT Systems',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ]

  async getManagedUsers(): Promise<ManagedUser[]> {
    if (isFirebaseConfigured) {
      const firestoreUsers = await authRepository.getAllUsersFromFirestore()
      if (firestoreUsers.length > 0) {
        return firestoreUsers.map((u) => ({
          uid: u.uid,
          name: u.displayName || u.name,
          email: u.email,
          role: u.role,
          department: u.department || 'General',
          signatureUrl: u.signatureUrl,
          updatedAt: u.updatedAt || u.createdAt,
        }))
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200))
    return [...this.users]
  }

  async updateUserRole(uid: string, newRole: UserRole): Promise<ManagedUser> {
    if (isFirebaseConfigured) {
      await authRepository.updateUserRoleInFirestore(uid, newRole)
      const updatedUser = await authRepository.getUserFromFirestore(uid)
      return {
        uid,
        name: updatedUser?.displayName || updatedUser?.name || 'Pengguna',
        email: updatedUser?.email || '',
        role: updatedUser?.role || newRole,
        department: updatedUser?.department || 'General',
        updatedAt: updatedUser?.updatedAt || new Date().toISOString(),
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200))
    const user = this.users.find((u) => u.uid === uid)
    if (!user) {
      throw new Error('Pengguna tidak ditemukan')
    }
    user.role = newRole
    user.updatedAt = new Date().toISOString()
    return { ...user }
  }

  async updateSignature(uid: string, signatureUrl: string): Promise<UserProfileSettings> {
    if (isFirebaseConfigured) {
      const existing = await authRepository.getUserFromFirestore(uid)
      if (existing) {
        await authRepository.saveUserToFirestore({
          ...existing,
          signatureUrl,
          updatedAt: new Date().toISOString(),
        })
        return {
          uid,
          name: existing.displayName || existing.name,
          email: existing.email,
          role: existing.role,
          signatureUrl,
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
    return {
      uid,
      name: 'Hendra Approver',
      email: 'hendra@koneksi.co.id',
      role: 'approver',
      signatureUrl,
    }
  }
}

export const settingsRepository = new SettingsRepository()

