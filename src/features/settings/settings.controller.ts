import { useState, useEffect, useCallback } from 'react'
import type { ManagedUser } from './settings.model'
import type { UserRole } from '@/features/auth/auth.model'
import { settingsService } from './settings.service'
import { useAuthController } from '@/features/auth/auth.controller'

export function useSettingsController() {
  const { user } = useAuthController()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await settingsService.listUsers()
      setUsers(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat pengguna'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const updated = await settingsService.changeUserRole(uid, newRole, user)
      setUsers((prev) => prev.map((u) => (u.uid === uid ? updated : u)))
      setSuccessMessage(`Peran pengguna ${updated.name} berhasil diubah menjadi ${newRole}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui peran pengguna'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const uploadSignature = async (uid: string, dataUrl: string) => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await settingsService.saveSignature(uid, dataUrl)
      setSuccessMessage('Spesimen tanda tangan digital berhasil diperbarui')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan tanda tangan'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const uploadSignatureFile = async (uid: string, file: File): Promise<string> => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await settingsService.uploadAndSaveSignature(uid, file)
      setSuccessMessage('Berkas tanda tangan berhasil diunggah dan diperbarui')
      return res.signatureUrl || ''
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah berkas tanda tangan'
      setError(msg)
      throw err
    } finally {
      setSaving(false)
    }
  }

  return {
    users,
    loading,
    saving,
    error,
    successMessage,
    clearSuccess: () => setSuccessMessage(null),
    updateUserRole,
    uploadSignature,
    uploadSignatureFile,
    refresh: fetchUsers,
  }
}
