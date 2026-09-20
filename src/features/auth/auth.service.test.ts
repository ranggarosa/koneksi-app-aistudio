import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from './auth.service'
import type { IAuthRepository } from './auth.repository'
import type { User } from './auth.model'

describe('AuthService', () => {
  let mockAuthRepo: IAuthRepository
  let authService: AuthService

  const mockUser: User = {
    uid: 'user_123',
    displayName: 'Test User',
    name: 'Test User',
    email: 'test@example.com',
    role: 'drafter',
    signatureUrl: undefined,
    createdAt: '2026-09-05T00:00:00Z',
  }

  const adminUser: User = {
    uid: 'admin_999',
    displayName: 'Admin User',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: '2026-09-05T00:00:00Z',
  }

  beforeEach(() => {
    mockAuthRepo = {
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      getCurrentUser: vi.fn(),
      saveUserToFirestore: vi.fn(),
      subscribeToAuthState: vi.fn(),
      getUserFromFirestore: vi.fn(),
      ensureUserInFirestore: vi.fn(),
      updateUserRoleInFirestore: vi.fn(),
      getAllUsersFromFirestore: vi.fn(),
    }
    authService = new AuthService(mockAuthRepo)
  })

  describe('getCurrentUser & subscribeToAuthState', () => {
    it('delegates getCurrentUser to repository', async () => {
      vi.spyOn(mockAuthRepo, 'getCurrentUser').mockResolvedValue(mockUser)
      const user = await authService.getCurrentUser()
      expect(user).toEqual(mockUser)
      expect(mockAuthRepo.getCurrentUser).toHaveBeenCalledOnce()
    })

    it('delegates subscribeToAuthState to repository', () => {
      const callback = vi.fn()
      const unsubscribe = vi.fn()
      vi.spyOn(mockAuthRepo, 'subscribeToAuthState').mockReturnValue(unsubscribe)

      const result = authService.subscribeToAuthState(callback)
      expect(mockAuthRepo.subscribeToAuthState).toHaveBeenCalledWith(callback)
      expect(result).toBe(unsubscribe)
    })

    it('refreshes current user from firestore', async () => {
      vi.spyOn(mockAuthRepo, 'getUserFromFirestore').mockResolvedValue(mockUser)
      const res = await authService.refreshCurrentUser('user_123')
      expect(res).toEqual(mockUser)
      expect(mockAuthRepo.getUserFromFirestore).toHaveBeenCalledWith('user_123')
    })
  })

  describe('loginWithGoogle & Firestore users collection', () => {
    it('automatically ensures/creates user in Firestore users collection on first login', async () => {
      const rawUser: User = {
        uid: 'user_first_time',
        displayName: 'First Time User',
        name: 'First Time User',
        email: 'first@example.com',
        role: 'drafter',
        createdAt: '2026-09-06T00:00:00Z',
      }
      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockResolvedValue(rawUser)
      // Simulates document does not exist yet in Firestore
      vi.spyOn(mockAuthRepo, 'getUserFromFirestore').mockResolvedValue(null)
      vi.spyOn(mockAuthRepo, 'ensureUserInFirestore').mockResolvedValue(rawUser)

      const user = await authService.loginWithGoogle()

      expect(mockAuthRepo.ensureUserInFirestore).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'user_first_time',
          email: 'first@example.com',
          displayName: 'First Time User',
        }),
        'drafter'
      )
      expect(user.uid).toBe('user_first_time')
    })

    it('loads existing user and preserves database truth role from Firestore', async () => {
      const existingUser: User = {
        uid: 'user_existing',
        displayName: 'Existing Reviewer',
        name: 'Existing Reviewer',
        email: 'reviewer@example.com',
        role: 'reviewer',
        signatureUrl: 'https://storage.googleapis.com/signatures/rev.png',
        createdAt: '2026-09-01T00:00:00Z',
      }
      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockResolvedValue(existingUser)
      vi.spyOn(mockAuthRepo, 'getUserFromFirestore').mockResolvedValue(existingUser)

      const user = await authService.loginWithGoogle()

      expect(user.role).toBe('reviewer')
      expect(user.signatureUrl).toBe('https://storage.googleapis.com/signatures/rev.png')
      expect(mockAuthRepo.ensureUserInFirestore).not.toHaveBeenCalled()
    })

    it('throws error when user object is null or missing uid', async () => {
      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockResolvedValue(null as any)

      await expect(authService.loginWithGoogle()).rejects.toThrow(
        'Informasi pengguna tidak valid dari penyedia autentikasi.'
      )
    })

    it('formats auth errors properly (popup closed, blocked, unauthorized, network)', async () => {
      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockRejectedValue({
        code: 'auth/popup-closed-by-user',
      })

      await expect(authService.loginWithGoogle()).rejects.toThrow(
        'Jendela login ditutup sebelum otentikasi selesai.'
      )

      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockRejectedValue({
        code: 'auth/popup-blocked',
      })

      await expect(authService.loginWithGoogle()).rejects.toThrow(
        'Pop-up login diblokir oleh browser. Harap izinkan pop-up untuk situs ini.'
      )

      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockRejectedValue({
        code: 'auth/network-request-failed',
      })

      await expect(authService.loginWithGoogle()).rejects.toThrow(
        'Koneksi jaringan terputus. Silakan periksa jaringan internet Anda.'
      )

      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockRejectedValue({
        code: 'auth/unauthorized-domain',
      })

      await expect(authService.loginWithGoogle()).rejects.toThrow(
        'Domain aplikasi belum terdaftar pada daftar Authorized Domains di Firebase Console.'
      )
    })
  })

  describe('Role Provisioning (Admin Dashboard & Security Rules)', () => {
    it('allows user with Admin role to modify the role of another user', async () => {
      vi.spyOn(mockAuthRepo, 'updateUserRoleInFirestore').mockResolvedValue(undefined)

      await expect(
        authService.updateUserRole(adminUser, 'target_user_456', 'approver')
      ).resolves.toBeUndefined()

      expect(mockAuthRepo.updateUserRoleInFirestore).toHaveBeenCalledWith(
        'target_user_456',
        'approver'
      )
    })

    it('allows Admin with capitalized "Admin" role to modify user role', async () => {
      vi.spyOn(mockAuthRepo, 'updateUserRoleInFirestore').mockResolvedValue(undefined)
      const capitalizedAdmin: User = {
        ...adminUser,
        role: 'Admin' as any,
      }

      await expect(
        authService.updateUserRole(capitalizedAdmin, 'target_user_456', 'reviewer')
      ).resolves.toBeUndefined()

      expect(mockAuthRepo.updateUserRoleInFirestore).toHaveBeenCalledWith(
        'target_user_456',
        'reviewer'
      )
    })

    it('rejects role modification if executor is not an Admin (e.g. Drafter)', async () => {
      const drafterExecutor: User = {
        ...mockUser,
        role: 'drafter',
      }

      await expect(
        authService.updateUserRole(drafterExecutor, 'target_user_456', 'admin')
      ).rejects.toThrow(
        /Akses ditolak: Hanya pengguna dengan peran Admin yang berwenang mengubah peran pengguna/i
      )
      expect(mockAuthRepo.updateUserRoleInFirestore).not.toHaveBeenCalled()
    })

    it('rejects role modification if executor is unauthenticated (null)', async () => {
      await expect(
        authService.updateUserRole(null, 'target_user_456', 'reviewer')
      ).rejects.toThrow(/Autentikasi diperlukan/i)
      expect(mockAuthRepo.updateUserRoleInFirestore).not.toHaveBeenCalled()
    })

    it('rejects role modification if targetUid is empty', async () => {
      await expect(
        authService.updateUserRole(adminUser, '   ', 'reviewer')
      ).rejects.toThrow(/ID pengguna target tidak boleh kosong/i)
    })

    it('rejects role modification if newRole is invalid', async () => {
      await expect(
        authService.updateUserRole(adminUser, 'target_user_456', 'super_admin' as any)
      ).rejects.toThrow(/Peran 'super_admin' tidak valid/i)
    })

    it('allows Admin to fetch all users and rejects non-admin', async () => {
      vi.spyOn(mockAuthRepo, 'getAllUsersFromFirestore').mockResolvedValue([adminUser, mockUser])

      const list = await authService.getAllUsers(adminUser)
      expect(list).toHaveLength(2)

      await expect(authService.getAllUsers(mockUser)).rejects.toThrow(/Akses ditolak/i)
    })
  })

  describe('logout', () => {
    it('successfully calls repo.signOut', async () => {
      vi.spyOn(mockAuthRepo, 'signOut').mockResolvedValue(undefined)
      await expect(authService.logout()).resolves.toBeUndefined()
      expect(mockAuthRepo.signOut).toHaveBeenCalledOnce()
    })

    it('throws formatted error if signOut fails', async () => {
      vi.spyOn(mockAuthRepo, 'signOut').mockRejectedValue(new Error('Network error'))
      await expect(authService.logout()).rejects.toThrow('Network error')
    })
  })

  describe('role permission checks', () => {
    it('isAdmin returns true for Admin and false for others', () => {
      expect(authService.isAdmin(adminUser)).toBe(true)
      expect(authService.isAdmin({ ...adminUser, role: 'Admin' as any })).toBe(true)
      expect(authService.isAdmin(mockUser)).toBe(false)
      expect(authService.isAdmin(null)).toBe(false)
    })

    it('canCreateLetter returns true only for drafter and admin (case-insensitive)', () => {
      expect(authService.canCreateLetter({ ...mockUser, role: 'drafter' })).toBe(true)
      expect(authService.canCreateLetter({ ...mockUser, role: 'Drafter' as any })).toBe(true)
      expect(authService.canCreateLetter({ ...mockUser, role: 'admin' })).toBe(true)
      expect(authService.canCreateLetter({ ...mockUser, role: 'Admin' as any })).toBe(true)
      expect(authService.canCreateLetter({ ...mockUser, role: 'reviewer' })).toBe(false)
      expect(authService.canCreateLetter({ ...mockUser, role: 'approver' })).toBe(false)
      expect(authService.canCreateLetter(null)).toBe(false)
    })

    it('canApproveLetter returns true for reviewer, approver, and admin', () => {
      expect(authService.canApproveLetter({ ...mockUser, role: 'reviewer' })).toBe(true)
      expect(authService.canApproveLetter({ ...mockUser, role: 'approver' })).toBe(true)
      expect(authService.canApproveLetter({ ...mockUser, role: 'Approver' as any })).toBe(true)
      expect(authService.canApproveLetter({ ...mockUser, role: 'admin' })).toBe(true)
      expect(authService.canApproveLetter({ ...mockUser, role: 'Admin' as any })).toBe(true)
      expect(authService.canApproveLetter({ ...mockUser, role: 'drafter' })).toBe(false)
      expect(authService.canApproveLetter(null)).toBe(false)
    })
  })
})

