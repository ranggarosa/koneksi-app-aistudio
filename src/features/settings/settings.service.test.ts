import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsService } from './settings.service'
import type { ISettingsRepository } from './settings.repository'
import type { IStorageRepository } from './storage.repository'
import type { ManagedUser, UserProfileSettings } from './settings.model'

describe('SettingsService', () => {
  let mockSettingsRepo: ISettingsRepository
  let mockStorageRepo: IStorageRepository
  let settingsService: SettingsService

  const mockUsers: ManagedUser[] = [
    {
      uid: 'u1',
      name: 'User One',
      email: 'one@example.com',
      role: 'drafter',
      department: 'Divisi Legal',
    },
    {
      uid: 'u2',
      name: 'User Two',
      email: 'two@example.com',
      role: 'approver',
      department: 'Direksi',
    },
  ]

  beforeEach(() => {
    mockSettingsRepo = {
      getManagedUsers: vi.fn().mockResolvedValue(mockUsers),
      updateUserRole: vi.fn().mockImplementation((uid, role) => {
        const found = mockUsers.find((u) => u.uid === uid)
        return Promise.resolve(found ? { ...found, role } : { uid, name: 'Unknown', email: '', role, department: '' })
      }),
      updateSignature: vi.fn().mockImplementation((uid, signatureUrl) =>
        Promise.resolve({
          uid,
          name: 'User One',
          email: 'one@example.com',
          role: 'approver',
          signatureUrl,
        } as UserProfileSettings)
      ),
    }

    mockStorageRepo = {
      uploadSignature: vi.fn().mockResolvedValue('https://storage.googleapis.com/test-bucket/signatures/u1/sig.png'),
    }

    settingsService = new SettingsService(mockSettingsRepo, mockStorageRepo)
  })

  describe('listUsers', () => {
    it('returns managed users from repository', async () => {
      const users = await settingsService.listUsers()
      expect(users).toEqual(mockUsers)
      expect(mockSettingsRepo.getManagedUsers).toHaveBeenCalledOnce()
    })
  })

  describe('changeUserRole', () => {
    it('throws error if uid or role is missing', async () => {
      await expect(settingsService.changeUserRole('', 'approver')).rejects.toThrow(
        'ID pengguna dan peran baru wajib diisi'
      )
      await expect(settingsService.changeUserRole('u1', '' as any)).rejects.toThrow(
        'ID pengguna dan peran baru wajib diisi'
      )
    })

    it('updates user role successfully', async () => {
      const updated = await settingsService.changeUserRole('u1', 'reviewer')
      expect(mockSettingsRepo.updateUserRole).toHaveBeenCalledWith('u1', 'reviewer')
      expect(updated.role).toBe('reviewer')
    })
  })

  describe('saveSignature', () => {
    it('throws error if signature URL is empty', async () => {
      await expect(settingsService.saveSignature('u1', '')).rejects.toThrow(
        'URL atau file tanda tangan digital tidak valid'
      )
    })

    it('saves signature URL successfully', async () => {
      const res = await settingsService.saveSignature('u1', 'https://example.com/sig.png')
      expect(mockSettingsRepo.updateSignature).toHaveBeenCalledWith('u1', 'https://example.com/sig.png')
      expect(res.signatureUrl).toBe('https://example.com/sig.png')
    })
  })

  describe('uploadAndSaveSignature', () => {
    it('throws error if uid or file is missing', async () => {
      const dummyFile = new File(['fake-content'], 'sig.png', { type: 'image/png' })
      await expect(settingsService.uploadAndSaveSignature('', dummyFile)).rejects.toThrow(
        'ID pengguna dan berkas tanda tangan wajib disertakan'
      )
      await expect(settingsService.uploadAndSaveSignature('u1', null as any)).rejects.toThrow(
        'ID pengguna dan berkas tanda tangan wajib disertakan'
      )
    })

    it('uploads to storage repository and saves returned url to settings repo', async () => {
      const dummyFile = new File(['fake-content'], 'sig.png', { type: 'image/png' })
      const res = await settingsService.uploadAndSaveSignature('u1', dummyFile)

      expect(mockStorageRepo.uploadSignature).toHaveBeenCalledWith(dummyFile, 'u1')
      expect(mockSettingsRepo.updateSignature).toHaveBeenCalledWith(
        'u1',
        'https://storage.googleapis.com/test-bucket/signatures/u1/sig.png'
      )
      expect(res.signatureUrl).toBe('https://storage.googleapis.com/test-bucket/signatures/u1/sig.png')
    })
  })
})
