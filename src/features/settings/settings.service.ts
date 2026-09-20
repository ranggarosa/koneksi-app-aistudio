import type { ISettingsRepository } from './settings.repository'
import { settingsRepository } from './settings.repository'
import type { IStorageRepository } from './storage.repository'
import { storageRepository } from './storage.repository'
import type { ManagedUser, UserProfileSettings } from './settings.model'
import type { User, UserRole } from '@/features/auth/auth.model'
import { normalizeRole } from '@/features/auth/auth.model'
import type { IAuditService } from '@/features/audit/audit.service'
import { auditService } from '@/features/audit/audit.service'

export class SettingsService {
  constructor(
    private readonly repo: ISettingsRepository,
    private readonly storageRepo: IStorageRepository = storageRepository,
    private readonly audit: IAuditService = auditService
  ) {}

  async listUsers(): Promise<ManagedUser[]> {
    return this.repo.getManagedUsers()
  }

  async changeUserRole(uid: string, newRole: UserRole, executor?: User | null): Promise<ManagedUser> {
    if (executor !== undefined) {
      if (!executor) {
        throw new Error('Autentikasi diperlukan untuk mengubah peran pengguna')
      }
      if (normalizeRole(executor.role) !== 'admin') {
        throw new Error('Akses ditolak: Hanya pengguna dengan peran Admin yang berwenang mengubah peran pengguna')
      }
    }

    if (!uid || !newRole) {
      throw new Error('ID pengguna dan peran baru wajib diisi')
    }

    // Capture previous state for audit log
    let previousRole = 'unknown'
    let targetName = 'User'
    try {
      const existingUsers = await this.repo.getManagedUsers()
      const found = existingUsers.find((u) => u.uid === uid)
      if (found) {
        previousRole = found.role
        targetName = found.name
      }
    } catch {
      // Non-blocking fallback
    }

    const updated = await this.repo.updateUserRole(uid, newRole)

    // Write immutable audit log for role change
    this.audit
      .logUserRoleChanged({
        targetUserId: uid,
        targetUserName: targetName,
        previousRole,
        newRole,
        actor: {
          userId: executor?.uid || 'admin',
          name: executor?.name || 'Administrator',
          role: executor?.role || 'admin',
        },
      })
      .catch((err) => {
        console.warn('Gagal mencatat audit log changeUserRole:', err)
      })

    return updated
  }

  async saveSignature(uid: string, signatureUrl: string): Promise<UserProfileSettings> {
    if (!signatureUrl) {
      throw new Error('URL atau file tanda tangan digital tidak valid')
    }
    return this.repo.updateSignature(uid, signatureUrl)
  }

  async uploadAndSaveSignature(uid: string, file: File): Promise<UserProfileSettings> {
    if (!uid || !file) {
      throw new Error('ID pengguna dan berkas tanda tangan wajib disertakan')
    }
    const downloadUrl = await this.storageRepo.uploadSignature(file, uid)
    return this.repo.updateSignature(uid, downloadUrl)
  }
}

export const settingsService = new SettingsService(settingsRepository, storageRepository)

