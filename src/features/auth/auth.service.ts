import type { IAuthRepository } from './auth.repository'
import { authRepository } from './auth.repository'
import type { User, UserRole } from './auth.model'
import { normalizeRole } from './auth.model'

export class AuthService {
  constructor(private readonly repo: IAuthRepository) {}

  async getCurrentUser(): Promise<User | null> {
    return this.repo.getCurrentUser()
  }

  subscribeToAuthState(callback: (user: User | null) => void): () => void {
    return this.repo.subscribeToAuthState(callback)
  }

  async refreshCurrentUser(uid: string): Promise<User | null> {
    if (!uid) return null
    return this.repo.getUserFromFirestore(uid)
  }

  formatAuthError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code: string }).code
      switch (code) {
        case 'auth/popup-closed-by-user':
          return 'Jendela login ditutup sebelum otentikasi selesai.'
        case 'auth/cancelled-popup-request':
          return 'Proses login sebelumnya dibatalkan.'
        case 'auth/popup-blocked':
          return 'Pop-up login diblokir oleh browser. Harap izinkan pop-up untuk situs ini.'
        case 'auth/unauthorized-domain':
          return 'Domain aplikasi belum terdaftar pada daftar Authorized Domains di Firebase Console.'
        case 'auth/network-request-failed':
          return 'Koneksi jaringan terputus. Silakan periksa jaringan internet Anda.'
        default:
          return `Autentikasi gagal (${code}). Silakan coba beberapa saat lagi.`
      }
    }
    return error instanceof Error ? error.message : 'Terjadi kesalahan saat masuk dengan Google.'
  }

  async loginWithGoogle(preferredRole?: UserRole): Promise<User> {
    try {
      const user = await this.repo.signInWithGoogle(preferredRole)

      if (!user || !user.uid) {
        throw new Error('Informasi pengguna tidak valid dari penyedia autentikasi.')
      }

      // Automatically ensure user document exists in Firestore users collection
      let firestoreUser = await this.repo.getUserFromFirestore(user.uid)
      if (!firestoreUser) {
        firestoreUser = await this.repo.ensureUserInFirestore(
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.name,
            photoURL: user.avatarUrl,
          },
          user.role || preferredRole || 'drafter'
        )
      }

      // Ensure default role is 'drafter' if none assigned
      if (!firestoreUser.role) {
        firestoreUser.role = 'drafter'
        await this.repo.saveUserToFirestore(firestoreUser)
      }

      return firestoreUser
    } catch (err) {
      const formattedMessage = this.formatAuthError(err)
      throw new Error(formattedMessage)
    }
  }

  async logout(): Promise<void> {
    try {
      await this.repo.signOut()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal keluar dari sesi'
      throw new Error(msg)
    }
  }

  /**
   * Role Provisioning: Updates a target user's role in the database.
   * Strict Security Rule: Only users with the Admin role can modify user roles.
   */
  async updateUserRole(
    executor: User | null,
    targetUid: string,
    newRole: UserRole
  ): Promise<void> {
    if (!executor) {
      throw new Error('Autentikasi diperlukan untuk mengubah peran pengguna.')
    }

    const executorRole = normalizeRole(executor.role)
    if (executorRole !== 'admin') {
      throw new Error('Akses ditolak: Hanya pengguna dengan peran Admin yang berwenang mengubah peran pengguna.')
    }

    if (!targetUid || !targetUid.trim()) {
      throw new Error('ID pengguna target tidak boleh kosong.')
    }

    const validRoles: UserRole[] = ['admin', 'drafter', 'reviewer', 'approver', 'Admin', 'Drafter', 'Reviewer', 'Approver']
    if (!newRole || !validRoles.includes(newRole)) {
      throw new Error(`Peran '${newRole}' tidak valid. Pilihan: Admin, Drafter, Reviewer, Approver.`)
    }

    await this.repo.updateUserRoleInFirestore(targetUid.trim(), newRole)
  }

  /**
   * Retrieves all users (for Admin dashboard user management table)
   * Protected: Admin role only
   */
  async getAllUsers(executor: User | null): Promise<User[]> {
    if (!executor) {
      throw new Error('Autentikasi diperlukan.')
    }

    const executorRole = normalizeRole(executor.role)
    if (executorRole !== 'admin') {
      throw new Error('Akses ditolak: Hanya pengguna dengan peran Admin yang dapat melihat daftar seluruh pengguna.')
    }

    return this.repo.getAllUsersFromFirestore()
  }

  isAdmin(user: User | null): boolean {
    if (!user) return false
    return normalizeRole(user.role) === 'admin'
  }

  canCreateLetter(user: User | null): boolean {
    if (!user) return false
    const role = normalizeRole(user.role)
    return role === 'drafter' || role === 'admin'
  }

  canApproveLetter(user: User | null): boolean {
    if (!user) return false
    const role = normalizeRole(user.role)
    return role === 'approver' || role === 'reviewer' || role === 'admin'
  }
}

export const authService = new AuthService(authRepository)

