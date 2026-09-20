import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  getCountFromServer,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/config/firebase'
import type { Letter, Counter, ApproverOption, LetterMetrics } from './letter.model'

export interface ILetterRepository {
  findAll(): Promise<Letter[]>
  findById(id: string): Promise<Letter | null>
  subscribeById(id: string, callback: (letter: Letter | null) => void): () => void
  create(letter: Omit<Letter, 'letterId'>): Promise<Letter>
  update(id: string, partial: Partial<Letter>): Promise<Letter>
  getNextSequence(department: string, month: number, year: number): Promise<number>
  getApprovalCandidates(): Promise<{ reviewers: ApproverOption[]; approvers: ApproverOption[] }>
  getAggregateMetrics(): Promise<LetterMetrics>
  subscribeMetrics(callback: (metrics: LetterMetrics) => void): () => void
}

class LetterRepository implements ILetterRepository {
  private inMemoryLetters: Letter[] = [
    {
      letterId: 'ltr_001',
      letterNumber: '0051.ST/HR/IX/2026',
      templateType: 'Surat Tugas',
      contentData: {
        recipientName: 'Budi Santoso',
        recipientNik: '19890412001',
        destination: 'Bandung',
        purpose: 'Audit Lapangan Cabang',
        startDate: '2026-09-10',
        endDate: '2026-09-12',
      },
      status: 'Approved',
      drafterId: 'usr_001',
      drafterName: 'Ahmad Drafter',
      approvalFlow: [
        {
          userId: 'usr_002',
          userName: 'Siti Reviewer',
          role: 'reviewer',
          status: 'approved',
          notes: 'Dokumen lengkap dan sesuai ketentuan.',
        },
        {
          userId: 'usr_003',
          userName: 'Hendra Approver',
          role: 'approver',
          status: 'approved',
          signedAt: '2026-09-02T10:00:00Z',
        },
      ],
      finalPdfUrl: 'https://example.com/letters/0051-ST-HR-IX-2026.pdf',
      createdAt: '2026-09-01T08:30:00Z',
      updatedAt: '2026-09-02T10:00:00Z',
    },
    {
      letterId: 'ltr_002',
      letterNumber: '0052.SP1/HR/IX/2026',
      templateType: 'SP 1',
      contentData: {
        recipientName: 'Rian Pratama',
        recipientNik: '19920115004',
        violation: 'Keterlambatan berturut-turut melebihi batas toleransi',
        effectiveDate: '2026-09-05',
      },
      status: 'In Review',
      drafterId: 'usr_001',
      drafterName: 'Ahmad Drafter',
      approvalFlow: [
        {
          userId: 'usr_002',
          userName: 'Siti Reviewer',
          role: 'reviewer',
          status: 'pending',
        },
        {
          userId: 'usr_003',
          userName: 'Hendra Approver',
          role: 'approver',
          status: 'pending',
        },
      ],
      createdAt: '2026-09-04T11:00:00Z',
      updatedAt: '2026-09-04T11:00:00Z',
    },
    {
      letterId: 'ltr_003',
      letterNumber: '0053.SP2/HR/IX/2026',
      templateType: 'SP 2',
      contentData: {
        recipientName: 'Dewi Lestari',
        recipientNik: '19950720008',
        violation: 'Tidak mencapai target SOP setelah peringatan pertama',
        effectiveDate: '2026-09-05',
      },
      status: 'Draft',
      drafterId: 'usr_001',
      drafterName: 'Ahmad Drafter',
      approvalFlow: [
        {
          userId: 'usr_002',
          userName: 'Siti Reviewer',
          role: 'reviewer',
          status: 'pending',
        },
        {
          userId: 'usr_003',
          userName: 'Hendra Approver',
          role: 'approver',
          status: 'pending',
        },
      ],
      createdAt: '2026-09-05T09:15:00Z',
      updatedAt: '2026-09-05T09:15:00Z',
    },
  ]

  private counters: Record<string, Counter> = {
    'HR_9_2026': {
      counterId: 'HR_9_2026',
      department: 'HR',
      month: 9,
      year: 2026,
      currentSequence: 53,
    },
  }

  async create(letterData: Omit<Letter, 'letterId'>): Promise<Letter> {
    if (isFirebaseConfigured) {
      try {
        const lettersCol = collection(db, 'letters')
        const docRef = await addDoc(lettersCol, {
          ...letterData,
          createdAt: letterData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        const created: Letter = {
          letterId: docRef.id,
          ...letterData,
        }
        return created
      } catch (err) {
        console.warn('Gagal menyimpan ke Firestore, beralih ke local fallback:', err)
      }
    }

    // In-memory fallback
    await new Promise((resolve) => setTimeout(resolve, 250))
    const newLetter: Letter = {
      ...letterData,
      letterId: `ltr_${Date.now()}`,
    }
    this.inMemoryLetters.unshift(newLetter)
    return newLetter
  }

  async findAll(): Promise<Letter[]> {
    if (isFirebaseConfigured) {
      try {
        const querySnapshot = await getDocs(collection(db, 'letters'))
        if (!querySnapshot.empty) {
          const items: Letter[] = []
          querySnapshot.forEach((d) => {
            const data = d.data()
            items.push({
              letterId: d.id,
              letterNumber: data.letterNumber || `DRAFT-${d.id.slice(0, 5)}`,
              templateType: data.templateType || 'Surat',
              contentData: data.contentData || {},
              status: data.status || 'Draft',
              drafterId: data.drafterId || '',
              drafterName: data.drafterName || 'Drafter',
              approvalFlow: data.approvalFlow || [],
              finalPdfUrl: data.finalPdfUrl,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            })
          })
          return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        }
      } catch (err) {
        console.warn('Gagal membaca koleksi letters dari Firestore:', err)
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200))
    return [...this.inMemoryLetters]
  }

  async findById(id: string): Promise<Letter | null> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'letters', id)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          const data = snap.data()
          return {
            letterId: snap.id,
            letterNumber: data.letterNumber || `DRAFT-${snap.id.slice(0, 5)}`,
            templateType: data.templateType || 'Surat',
            contentData: data.contentData || {},
            status: data.status || 'Draft',
            drafterId: data.drafterId || '',
            drafterName: data.drafterName || 'Drafter',
            approvalFlow: data.approvalFlow || [],
            finalPdfUrl: data.finalPdfUrl,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          }
        }
      } catch (err) {
        console.warn('Gagal membaca dokumen letter dari Firestore:', err)
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 150))
    const item = this.inMemoryLetters.find((l) => l.letterId === id)
    return item ? { ...item } : null
  }

  subscribeById(id: string, callback: (letter: Letter | null) => void): () => void {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'letters', id)
        const unsubscribe = onSnapshot(
          docRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data()
              const letter: Letter = {
                letterId: snap.id,
                letterNumber: data.letterNumber || `DRAFT-${snap.id.slice(0, 5)}`,
                templateType: data.templateType || 'Surat',
                googleDocTemplateId: data.googleDocTemplateId,
                contentData: data.contentData || {},
                status: data.status || 'Draft',
                drafterId: data.drafterId || '',
                drafterName: data.drafterName || 'Drafter',
                approvalFlow: data.approvalFlow || [],
                finalPdfUrl: data.finalPdfUrl,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || new Date().toISOString(),
              }
              callback(letter)
            } else {
              callback(null)
            }
          },
          (err) => {
            console.warn('Error onSnapshot Firestore listener:', err)
            this.findById(id).then(callback)
          }
        )
        return unsubscribe
      } catch (err) {
        console.warn('Gagal setup onSnapshot listener:', err)
      }
    }

    this.findById(id).then(callback)
    const interval = setInterval(() => {
      this.findById(id).then(callback)
    }, 1500)
    return () => clearInterval(interval)
  }

  async update(id: string, partial: Partial<Letter>): Promise<Letter> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'letters', id)
        await updateDoc(docRef, {
          ...partial,
          updatedAt: new Date().toISOString(),
        })
        const updatedDoc = await this.findById(id)
        if (updatedDoc) return updatedDoc
      } catch (err) {
        console.warn('Gagal update dokumen di Firestore:', err)
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200))
    const index = this.inMemoryLetters.findIndex((l) => l.letterId === id)
    if (index === -1) {
      throw new Error(`Surat dengan id ${id} tidak ditemukan`)
    }
    const updated = {
      ...this.inMemoryLetters[index],
      ...partial,
      updatedAt: new Date().toISOString(),
    }
    this.inMemoryLetters[index] = updated
    return updated
  }

  async getNextSequence(department: string, month: number, year: number): Promise<number> {
    await new Promise((resolve) => setTimeout(resolve, 150))
    const counterKey = `${department}_${month}_${year}`
    const existing = this.counters[counterKey]
    const nextSeq = existing ? existing.currentSequence + 1 : 1

    this.counters[counterKey] = {
      counterId: counterKey,
      department,
      month,
      year,
      currentSequence: nextSeq,
    }
    return nextSeq
  }

  async getApprovalCandidates(): Promise<{ reviewers: ApproverOption[]; approvers: ApproverOption[] }> {
    if (isFirebaseConfigured) {
      try {
        const usersSnap = await getDocs(collection(db, 'users'))
        if (!usersSnap.empty) {
          const reviewers: ApproverOption[] = []
          const approvers: ApproverOption[] = []

          usersSnap.forEach((d) => {
            const data = d.data()
            const candidate: ApproverOption = {
              uid: d.id,
              name: data.name || data.email || 'Pengguna',
              role: data.role || 'reviewer',
              department: data.department || 'HR',
            }

            if (data.role === 'reviewer') {
              reviewers.push(candidate)
            } else if (data.role === 'approver') {
              approvers.push(candidate)
            } else if (data.role === 'admin') {
              reviewers.push(candidate)
              approvers.push(candidate)
            }
          })

          if (approvers.length > 0) {
            return {
              reviewers: reviewers.length > 0 ? reviewers : [{ uid: 'usr_rev_fallback', name: 'Siti Reviewer (HR)', role: 'reviewer' }],
              approvers,
            }
          }
        }
      } catch (err) {
        console.warn('Gagal membaca users kandidat dari Firestore:', err)
      }
    }

    // Default options for demonstration and test
    return {
      reviewers: [
        { uid: 'usr_002', name: 'Siti Reviewer (HR Quality & Compliance)', role: 'reviewer', department: 'HR' },
        { uid: 'usr_005', name: 'Dewi Reviewer (Legal Compliance)', role: 'reviewer', department: 'Legal' },
      ],
      approvers: [
        { uid: 'usr_003', name: 'Hendra Approver (Head of HR)', role: 'approver', department: 'HR' },
        { uid: 'usr_006', name: 'Bambang Approver (VP People Ops)', role: 'approver', department: 'HR' },
      ],
    }
  }

  /**
   * Fetches real-time aggregate statistics using Firestore aggregation queries (getCountFromServer)
   * or falls back to in-memory count calculation.
   */
  async getAggregateMetrics(): Promise<LetterMetrics> {
    if (isFirebaseConfigured) {
      try {
        const lettersCol = collection(db, 'letters')
        const [totalSnap, draftsSnap, inReviewSnap, processingSnap, rejectedSnap, approvedSnap, bookedSnap, cancelledSnap] =
          await Promise.all([
            getCountFromServer(lettersCol),
            getCountFromServer(query(lettersCol, where('status', '==', 'Draft'))),
            getCountFromServer(query(lettersCol, where('status', '==', 'In Review'))),
            getCountFromServer(query(lettersCol, where('status', '==', 'Processing PDF'))),
            getCountFromServer(query(lettersCol, where('status', '==', 'Rejected'))),
            getCountFromServer(query(lettersCol, where('status', '==', 'Approved'))),
            getCountFromServer(query(lettersCol, where('status', '==', 'Booked'))),
            getCountFromServer(query(lettersCol, where('status', 'in', ['Cancelled', 'Canceled']))),
          ])

        const total = totalSnap.data().count
        const totalDrafts = draftsSnap.data().count
        const pendingApprovals = inReviewSnap.data().count + processingSnap.data().count
        const rejected = rejectedSnap.data().count
        const completed = approvedSnap.data().count
        const booked = bookedSnap.data().count
        const cancelled = cancelledSnap.data().count

        return {
          total,
          totalDrafts,
          pendingApprovals,
          rejected,
          completed,
          draftCount: totalDrafts,
          inReviewCount: inReviewSnap.data().count,
          approvedCount: completed,
          rejectedCount: rejected,
          bookedCount: booked,
          cancelledCount: cancelled,
        }
      } catch (err) {
        console.warn('Gagal menjalankan getCountFromServer Firestore, menggunakan in-memory fallback:', err)
      }
    }

    // In-memory calculation
    const total = this.inMemoryLetters.length
    const totalDrafts = this.inMemoryLetters.filter((l) => l.status === 'Draft').length
    const inReview = this.inMemoryLetters.filter((l) => l.status === 'In Review').length
    const processing = this.inMemoryLetters.filter((l) => l.status === 'Processing PDF').length
    const pendingApprovals = inReview + processing
    const rejected = this.inMemoryLetters.filter((l) => l.status === 'Rejected').length
    const completed = this.inMemoryLetters.filter((l) => l.status === 'Approved').length
    const booked = this.inMemoryLetters.filter((l) => l.status === 'Booked').length
    const cancelled = this.inMemoryLetters.filter((l) => l.status === 'Cancelled' || l.status === 'Canceled').length

    return {
      total,
      totalDrafts,
      pendingApprovals,
      rejected,
      completed,
      draftCount: totalDrafts,
      inReviewCount: inReview,
      approvedCount: completed,
      rejectedCount: rejected,
      bookedCount: booked,
      cancelledCount: cancelled,
    }
  }

  /**
   * Subscribes to real-time aggregate statistics for documents.
   */
  subscribeMetrics(callback: (metrics: LetterMetrics) => void): () => void {
    if (isFirebaseConfigured) {
      try {
        const lettersCol = collection(db, 'letters')
        const unsubscribe = onSnapshot(
          lettersCol,
          () => {
            // Recalculate aggregation metrics on collection changes
            this.getAggregateMetrics().then(callback).catch((err) => {
              console.warn('Error re-calculating aggregate metrics:', err)
            })
          },
          (err) => {
            console.warn('Error onSnapshot letters aggregation listener:', err)
            this.getAggregateMetrics().then(callback)
          }
        )
        return unsubscribe
      } catch (err) {
        console.warn('Gagal setup onSnapshot letters aggregation listener:', err)
      }
    }

    // In-memory polling / initial push
    this.getAggregateMetrics().then(callback)
    const interval = setInterval(() => {
      this.getAggregateMetrics().then(callback)
    }, 2000)
    return () => clearInterval(interval)
  }
}

export const letterRepository = new LetterRepository()
