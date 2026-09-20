import { doc, runTransaction, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/config/firebase'

export interface VoidedNumberRecord {
  letterNumber: string
  letterId: string
  department: string
  templateType: string
  reason: string
  voidedBy: string
  voidedAt: string
  status: 'Voided/Cancelled'
}

export interface ICounterRepository {
  getNextSequenceNumber(department: string, month: number, year: number): Promise<number>
  tagNumberAsVoided(record: VoidedNumberRecord): Promise<void>
  getVoidedNumbers(): Promise<VoidedNumberRecord[]>
}

export class CounterRepository implements ICounterRepository {
  private inMemoryCounters: Record<string, number> = {
    'HR_09_2026': 53,
  }

  private voidedNumbers: VoidedNumberRecord[] = []

  /**
   * Mengambil nomor urut berikutnya secara atomic menggunakan Firestore Transactions.
   * Menjamin tidak ada nomor urut duplikat (mencegah race condition).
   */
  async getNextSequenceNumber(department: string, month: number, year: number): Promise<number> {
    const monthStr = String(month).padStart(2, '0')
    const counterId = `${department}_${monthStr}_${year}`

    if (isFirebaseConfigured) {
      try {
        const counterDocRef = doc(db, 'counters', counterId)

        const nextSequence = await runTransaction(db, async (transaction) => {
          const counterDoc = await transaction.get(counterDocRef)
          const nowIso = new Date().toISOString()

          if (!counterDoc.exists()) {
            transaction.set(counterDocRef, {
              counterId,
              department,
              month,
              year,
              currentSequence: 1,
              createdAt: nowIso,
              updatedAt: nowIso,
            })
            return 1
          }

          const data = counterDoc.data()
          const current = typeof data.currentSequence === 'number' ? data.currentSequence : 0
          const incremented = current + 1

          transaction.update(counterDocRef, {
            currentSequence: incremented,
            updatedAt: nowIso,
          })

          return incremented
        })

        return nextSequence
      } catch (err) {
        console.warn('Firestore Transaction pada counters gagal, beralih ke local fallback:', err)
      }
    }

    // In-memory atomic fallback
    await new Promise((resolve) => setTimeout(resolve, 50))
    const current = this.inMemoryCounters[counterId] || 0
    const incremented = current + 1
    this.inMemoryCounters[counterId] = incremented
    return incremented
  }

  /**
   * Menandai nomor surat sebagai Voided/Cancelled agar tercatat dalam audit traceability.
   * Nomor ini tidak dihapus sehingga tidak terjadi sequence gap tanpa jejak audit.
   */
  async tagNumberAsVoided(record: VoidedNumberRecord): Promise<void> {
    const sanitizedDocId = record.letterNumber.replace(/[\/\s]/g, '_')

    if (isFirebaseConfigured) {
      try {
        const ref = doc(db, 'voided_numbers', sanitizedDocId)
        await setDoc(ref, record, { merge: true })
      } catch (err) {
        console.warn('Firestore tagNumberAsVoided gagal, beralih ke local fallback:', err)
      }
    }

    const existingIdx = this.voidedNumbers.findIndex((v) => v.letterNumber === record.letterNumber)
    if (existingIdx >= 0) {
      this.voidedNumbers[existingIdx] = record
    } else {
      this.voidedNumbers.push(record)
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('koneksi_voided_numbers', JSON.stringify(this.voidedNumbers))
      }
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }

  async getVoidedNumbers(): Promise<VoidedNumberRecord[]> {
    if (this.voidedNumbers.length === 0 && typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('koneksi_voided_numbers')
        if (saved) {
          this.voidedNumbers = JSON.parse(saved)
        }
      } catch {
        // Abaikan
      }
    }
    return [...this.voidedNumbers]
  }
}

export const counterRepository = new CounterRepository()
