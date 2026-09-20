import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StorageRepository } from './storage.repository'
import * as firebaseStorage from 'firebase/storage'
import * as firebaseConfig from '@/config/firebase'

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}))

describe('StorageRepository', () => {
  let repo: StorageRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new StorageRepository()
  })

  it('throws error when file is missing', async () => {
    await expect(repo.uploadSignature(null as any, 'user123')).rejects.toThrow(
      'File gambar tanda tangan tidak boleh kosong'
    )
  })

  it('throws error when userId is missing', async () => {
    const dummyFile = new File(['data'], 'sig.png', { type: 'image/png' })
    await expect(repo.uploadSignature(dummyFile, '')).rejects.toThrow(
      'User ID wajib disertakan untuk menyimpan tanda tangan'
    )
  })

  it('uploads file to Firebase Storage and returns download URL when configured', async () => {
    vi.spyOn(firebaseConfig, 'isFirebaseConfigured', 'get').mockReturnValue(true)

    const mockStorageInstance = { app: {} }
    const mockStorageRef = { fullPath: 'signatures/user123_12345.png' }
    const mockUploadResult = { ref: mockStorageRef }
    const mockUrl = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/signatures%2Fuser123.png?alt=media'

    vi.spyOn(firebaseStorage, 'getStorage').mockReturnValue(mockStorageInstance as any)
    vi.spyOn(firebaseStorage, 'ref').mockReturnValue(mockStorageRef as any)
    vi.spyOn(firebaseStorage, 'uploadBytes').mockResolvedValue(mockUploadResult as any)
    vi.spyOn(firebaseStorage, 'getDownloadURL').mockResolvedValue(mockUrl)

    const dummyFile = new File(['dummy-bytes'], 'signature.png', { type: 'image/png' })
    const result = await repo.uploadSignature(dummyFile, 'user123')

    expect(firebaseStorage.getStorage).toHaveBeenCalled()
    expect(firebaseStorage.ref).toHaveBeenCalledWith(
      mockStorageInstance,
      expect.stringMatching(/^signatures\/user123_\d+\.png$/)
    )
    expect(firebaseStorage.uploadBytes).toHaveBeenCalledWith(
      mockStorageRef,
      dummyFile,
      expect.objectContaining({
        contentType: 'image/png',
        customMetadata: expect.objectContaining({ uploadedBy: 'user123' }),
      })
    )
    expect(firebaseStorage.getDownloadURL).toHaveBeenCalledWith(mockStorageRef)
    expect(result).toBe(mockUrl)
  })

  it('falls back when Firebase Storage is not configured', async () => {
    vi.spyOn(firebaseConfig, 'isFirebaseConfigured', 'get').mockReturnValue(false)

    // Mock createObjectURL
    const mockObjectUrl = 'blob:http://localhost/signature-test'
    const originalCreateObjectURL = URL.createObjectURL
    URL.createObjectURL = vi.fn().mockReturnValue(mockObjectUrl)

    const dummyFile = new File(['dummy-bytes'], 'sig.jpg', { type: 'image/jpeg' })
    const result = await repo.uploadSignature(dummyFile, 'user_offline')

    expect(result).toBe(mockObjectUrl)

    URL.createObjectURL = originalCreateObjectURL
  })

  it('falls back when Firebase Storage upload encounters an exception', async () => {
    vi.spyOn(firebaseConfig, 'isFirebaseConfigured', 'get').mockReturnValue(true)
    vi.spyOn(firebaseStorage, 'getStorage').mockReturnValue({} as any)
    vi.spyOn(firebaseStorage, 'uploadBytes').mockRejectedValue(new Error('Network disconnected'))

    const mockObjectUrl = 'blob:http://localhost/fallback-test'
    const originalCreateObjectURL = URL.createObjectURL
    URL.createObjectURL = vi.fn().mockReturnValue(mockObjectUrl)

    const dummyFile = new File(['dummy-bytes'], 'sig.png', { type: 'image/png' })
    const result = await repo.uploadSignature(dummyFile, 'user_error')

    expect(result).toBe(mockObjectUrl)

    URL.createObjectURL = originalCreateObjectURL
  })
})
