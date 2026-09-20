import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CounterRepository } from './counter.repository'
import * as firestore from 'firebase/firestore'
import * as firebaseConfig from '@/config/firebase'

vi.mock('firebase/firestore')
vi.mock('@/config/firebase', () => ({
  db: {},
  isFirebaseConfigured: true,
}))

describe('CounterRepository - Dynamic Numbering & Atomic Transaction', () => {
  let counterRepo: CounterRepository

  beforeEach(() => {
    vi.clearAllMocks()
    counterRepo = new CounterRepository()
    // Make sure isFirebaseConfigured is true for test
    vi.spyOn(firebaseConfig, 'isFirebaseConfigured', 'get').mockReturnValue(true)
  })

  it('increments sequence atomically when counter document exists (e.g. 50 -> 51)', async () => {
    const mockCounterDocRef = { id: 'HR_09_2026' }
    vi.spyOn(firestore, 'doc').mockReturnValue(mockCounterDocRef as any)

    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({ currentSequence: 50 }),
      }),
      update: vi.fn(),
      set: vi.fn(),
    }

    vi.spyOn(firestore, 'runTransaction').mockImplementation(async (_db, updateFunction) => {
      return updateFunction(mockTransaction as any)
    })

    const sequence = await counterRepo.getNextSequenceNumber('HR', 9, 2026)

    expect(sequence).toBe(51)
    expect(mockTransaction.get).toHaveBeenCalledWith(mockCounterDocRef)
    expect(mockTransaction.update).toHaveBeenCalledWith(
      mockCounterDocRef,
      expect.objectContaining({
        currentSequence: 51,
        updatedAt: expect.any(String),
      })
    )
    expect(mockTransaction.set).not.toHaveBeenCalled()
  })

  it('initializes sequence to 1 when counter document does NOT exist', async () => {
    const mockCounterDocRef = { id: 'HR_10_2026' }
    vi.spyOn(firestore, 'doc').mockReturnValue(mockCounterDocRef as any)

    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => false,
        data: () => undefined,
      }),
      update: vi.fn(),
      set: vi.fn(),
    }

    vi.spyOn(firestore, 'runTransaction').mockImplementation(async (_db, updateFunction) => {
      return updateFunction(mockTransaction as any)
    })

    const sequence = await counterRepo.getNextSequenceNumber('HR', 10, 2026)

    expect(sequence).toBe(1)
    expect(mockTransaction.set).toHaveBeenCalledWith(
      mockCounterDocRef,
      expect.objectContaining({
        counterId: 'HR_10_2026',
        currentSequence: 1,
        department: 'HR',
        month: 10,
        year: 2026,
      })
    )
    expect(mockTransaction.update).not.toHaveBeenCalled()
  })
})
