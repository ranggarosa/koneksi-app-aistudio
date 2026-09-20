import { isFirebaseConfigured } from '@/config/firebase'
import type { ILetterRepository } from './letter.repository'
import { letterRepository } from './letter.repository'
import type { ICounterRepository } from './counter.repository'
import { counterRepository } from './counter.repository'
import type { IEmailNotificationService } from './email-notification.service'
import { emailNotificationService } from './email-notification.service'
import type { Letter, LetterStatus, CreateLetterDTO, ApproverOption, BookLetterNumberDTO, LetterMetrics } from './letter.model'
import { LETTER_TEMPLATES } from './letter.model'
import type { IAuditService } from '@/features/audit/audit.service'
import { auditService } from '@/features/audit/audit.service'

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export class LetterService {
  constructor(
    private readonly repo: ILetterRepository,
    private readonly counterRepo: ICounterRepository = counterRepository,
    private readonly notificationService: IEmailNotificationService = emailNotificationService,
    private readonly audit: IAuditService = auditService
  ) {}

  async getAllLetters(): Promise<Letter[]> {
    return this.repo.findAll()
  }

  async getLetterById(id: string): Promise<Letter | null> {
    return this.repo.findById(id)
  }

  async getApprovalOptions(): Promise<{ reviewers: ApproverOption[]; approvers: ApproverOption[] }> {
    return this.repo.getApprovalCandidates()
  }

  /**
   * Format penomoran surat resmi: [NOMOR_URUT].[KODE_SURAT]/[BULAN_ROMAWI]/[TAHUN]
   * Contoh: 0051.SP1/IX/2026, 0001.ST/IX/2026
   */
  formatLetterNumber(sequence: number, letterCode: string, date: Date = new Date()): string {
    const seqStr = String(sequence).padStart(4, '0')
    const romanMonth = ROMAN_MONTHS[date.getMonth()]
    const year = date.getFullYear()
    return `${seqStr}.${letterCode}/${romanMonth}/${year}`
  }

  validateLetterPayload(dto: CreateLetterDTO): void {
    if (!dto.templateType) {
      throw new Error('Kategori / Template surat wajib dipilih')
    }

    const { contentData } = dto
    if (!contentData) {
      throw new Error('Data formulir surat tidak boleh kosong')
    }

    // Common required fields
    if (!contentData.recipientName || String(contentData.recipientName).trim() === '') {
      throw new Error('Nama penerima / karyawan wajib diisi')
    }

    if (!contentData.recipientNik || String(contentData.recipientNik).trim() === '') {
      throw new Error('NIK karyawan wajib diisi')
    }

    if (!contentData.position || String(contentData.position).trim() === '') {
      throw new Error('Jabatan karyawan wajib diisi')
    }

    // Template specific validations
    if (dto.templateType === 'Surat Tugas') {
      if (!contentData.destination || String(contentData.destination).trim() === '') {
        throw new Error('Kota atau lokasi tujuan penugasan wajib diisi untuk Surat Tugas')
      }
      if (!contentData.purpose || String(contentData.purpose).trim() === '') {
        throw new Error('Keperluan / agenda penugasan wajib diisi untuk Surat Tugas')
      }
      if (!contentData.startDate) {
        throw new Error('Tanggal mulai penugasan wajib diisi')
      }
      if (!contentData.endDate) {
        throw new Error('Tanggal berakhir penugasan wajib diisi')
      }
    } else if (dto.templateType === 'SP 1' || dto.templateType === 'SP 2') {
      if (!contentData.violationReason || String(contentData.violationReason).trim() === '') {
        throw new Error(`Uraian alasan pelanggaran wajib diisi untuk ${dto.templateType}`)
      }
      if (!contentData.violationDate) {
        throw new Error('Tanggal terjadinya pelanggaran wajib diisi')
      }
      if (!contentData.effectiveDate) {
        throw new Error('Tanggal mulai berlakunya sanksi peringatan wajib diisi')
      }
    }

    // Approver validation: Must have at least 1 approver selected
    if (!dto.approverId || String(dto.approverId).trim() === '') {
      throw new Error('Minimal harus memilih 1 Petugas Approver Final')
    }
  }

  async createLetterDraft(
    dto: CreateLetterDTO,
    drafterId: string,
    drafterName: string,
    candidateUsers?: { reviewers: ApproverOption[]; approvers: ApproverOption[] }
  ): Promise<Letter> {
    this.validateLetterPayload(dto)

    const now = new Date()
    const nowIso = now.toISOString()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const dept = 'HR'

    // Ambil KODE_SURAT dari konfigurasi Template surat yang dipilih
    const templateConfig = LETTER_TEMPLATES[dto.templateType]
    const letterCode = templateConfig ? templateConfig.code : 'LTR'
    const googleDocTemplateId = dto.googleDocTemplateId || templateConfig?.googleDocTemplateId

    // Ambil nomor urut atomic dari Firestore Transactions
    const nextSequence = await this.counterRepo.getNextSequenceNumber(dept, month, year)

    // Rangkai nomor resmi: [NOMOR_URUT].[KODE_SURAT]/[BULAN_ROMAWI]/[TAHUN]
    const letterNumber = this.formatLetterNumber(nextSequence, letterCode, now)

    // Build approval flow steps
    const candidates = candidateUsers || (await this.repo.getApprovalCandidates())
    const approvalFlow: Letter['approvalFlow'] = []

    if (dto.reviewerId) {
      const reviewerUser = candidates.reviewers.find((r) => r.uid === dto.reviewerId)
      approvalFlow.push({
        userId: dto.reviewerId,
        userName: reviewerUser ? reviewerUser.name : 'Petugas Reviewer',
        role: 'reviewer',
        status: 'pending',
      })
    }

    const approverUser = candidates.approvers.find((a) => a.uid === dto.approverId)
    approvalFlow.push({
      userId: dto.approverId,
      userName: approverUser ? approverUser.name : 'Petugas Approver Final',
      role: 'approver',
      status: 'pending',
    })

    const newLetterData: Omit<Letter, 'letterId'> = {
      letterNumber,
      templateType: dto.templateType,
      googleDocTemplateId,
      contentData: {
        ...dto.contentData,
        jenisSurat: dto.jenisSurat || dto.contentData.jenisSurat || 'Surat Internal',
      },
      status: 'In Review',
      drafterId,
      drafterName,
      approvalFlow,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    const createdLetter = await this.repo.create(newLetterData)

    // Trigger notifikasi email ke pihak pertama di alur persetujuan
    if (createdLetter.approvalFlow.length > 0) {
      const firstPerson = createdLetter.approvalFlow[0]
      await this.notificationService.notifyNextApprover(
        { name: firstPerson.userName, role: firstPerson.role },
        createdLetter.letterNumber,
        createdLetter.templateType
      )
    }

    // Write immutable audit log for document creation
    this.audit
      .logDocumentCreated({
        letterId: createdLetter.letterId,
        letterNumber: createdLetter.letterNumber,
        templateType: createdLetter.templateType,
        actor: {
          userId: drafterId,
          name: drafterName,
          role: 'drafter',
        },
        initialState: createdLetter.status,
      })
      .catch((err) => {
        console.warn('Gagal mencatat audit log createLetterDraft:', err)
      })

    return createdLetter
  }

  async processApproval(
    letterId: string,
    reviewerOrApproverId: string,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<Letter> {
    const letter = await this.repo.findById(letterId)
    if (!letter) {
      throw new Error('Surat tidak ditemukan')
    }

    if (letter.status !== 'In Review' && letter.status !== 'Draft') {
      throw new Error(`Surat tidak dapat diproses karena statusnya sudah "${letter.status}"`)
    }

    const flow = [...letter.approvalFlow]
    const pendingStepIndex = flow.findIndex((step) => step.status === 'pending')

    if (pendingStepIndex === -1) {
      throw new Error('Tidak ada antrean persetujuan yang menunggu pada dokumen ini')
    }

    const currentPendingStep = flow[pendingStepIndex]

    // Validasi giliran persetujuan: Pengguna yang memproses harus pemilik giliran saat ini atau admin
    if (
      currentPendingStep.userId !== reviewerOrApproverId &&
      reviewerOrApproverId !== 'admin' &&
      !reviewerOrApproverId.includes(currentPendingStep.role)
    ) {
      throw new Error(
        `Bukan giliran Anda untuk memproses dokumen ini. Saat ini menunggu persetujuan dari ${currentPendingStep.userName} (${currentPendingStep.role})`
      )
    }

    flow[pendingStepIndex] = {
      ...currentPendingStep,
      status: action === 'approve' ? 'approved' : 'rejected',
      notes: notes?.trim() || undefined,
      signedAt: action === 'approve' ? new Date().toISOString() : undefined,
    }

    let nextStatus: LetterStatus = letter.status
    if (action === 'reject') {
      if (!notes || !notes.trim()) {
        throw new Error('Alasan penolakan dokumen wajib diisi')
      }
      nextStatus = 'Rejected'
      // Notifikasi penolakan ke Drafter
      await this.notificationService.notifyLetterRejected(
        { name: letter.drafterName },
        letter.letterNumber,
        currentPendingStep.userName,
        notes
      )
    } else {
      const nextPendingIndex = flow.findIndex((step) => step.status === 'pending')
      if (nextPendingIndex !== -1) {
        nextStatus = 'In Review'
        const nextPerson = flow[nextPendingIndex]
        // Notifikasi ke approver berikutnya dalam antrean
        await this.notificationService.notifyNextApprover(
          { name: nextPerson.userName, role: nextPerson.role },
          letter.letterNumber,
          letter.templateType
        )
      } else {
        // Seluruh approver telah menyetujui -> Status dialihkan ke 'Processing PDF'
        // agar Cloud Functions mengeksekusi Google Docs API & Google Drive API
        nextStatus = 'Processing PDF'
        await this.notificationService.notifyApprovalComplete(
          { name: letter.drafterName },
          letter.letterNumber,
          letter.templateType
        )

        // Jika Firebase belum terhubung (local dev / demo mock), simulasikan pipeline Cloud Functions
        if (!isFirebaseConfigured) {
          setTimeout(async () => {
            try {
              const bucketName = 'koneksi-app-dev.appspot.com'
              const mockPdfUrl = `https://storage.googleapis.com/${bucketName}/final_letters/${letterId}.pdf`
              await this.repo.update(letterId, {
                status: 'Approved',
                finalPdfUrl: mockPdfUrl,
                pdfError: undefined,
              })
            } catch (err) {
              console.warn('Simulasi PDF background generation gagal:', err)
            }
          }, 2000)
        }
      }
    }

    const updateData: Partial<Letter> = {
      approvalFlow: flow,
      status: nextStatus,
    }
    if (action === 'reject') {
      updateData.rejectionReason = notes?.trim()
      updateData.rejectedBy = currentPendingStep.userName
      updateData.rejectedAt = new Date().toISOString()
    }

    const updated = await this.repo.update(letterId, updateData)

    // Write immutable audit log
    if (action === 'approve') {
      this.audit
        .logDocumentApproved({
          letterId,
          letterNumber: letter.letterNumber,
          actor: {
            userId: reviewerOrApproverId,
            name: currentPendingStep.userName,
            role: currentPendingStep.role,
          },
          previousState: letter.status,
          newState: nextStatus === 'Processing PDF' ? 'Approved' : nextStatus,
          notes: notes?.trim(),
        })
        .catch((err) => console.warn('Gagal mencatat audit log approve:', err))
    } else {
      this.audit
        .logDocumentRejected({
          letterId,
          letterNumber: letter.letterNumber,
          actor: {
            userId: reviewerOrApproverId,
            name: currentPendingStep.userName,
            role: currentPendingStep.role,
          },
          reason: notes?.trim() || 'Ditolak',
          previousState: letter.status,
        })
        .catch((err) => console.warn('Gagal mencatat audit log reject:', err))
    }

    return updated
  }

  /**
   * Membatalkan surat resmi.
   * - Diinisiasi oleh Pembuat/Drafter asli atau Administrator.
   * - Strict validation: Dokumen dengan status 'Approved' tidak dapat dibatalkan,
   *   kecuali melalui role override Administrator (status diubah menjadi 'Cancelled' dengan audit trail).
   * - Tidak dapat membatalkan dokumen yang sudah berstatus 'Cancelled' / 'Canceled'.
   * - Efek samping data: Jika nomor surat telah diterbitkan (dari counterRepo atau standalone booking),
   *   nomor tersebut ditandai sebagai 'Voided/Cancelled' dalam audit traceability, BUKAN dihapus.
   */
  async cancelLetter(
    letterId: string,
    userId: string,
    userName: string,
    userRole: string,
    reason: string
  ): Promise<Letter> {
    if (!reason || !reason.trim()) {
      throw new Error('Alasan pembatalan surat wajib diisi')
    }

    const letter = await this.repo.findById(letterId)
    if (!letter) {
      throw new Error('Surat tidak ditemukan')
    }

    // Strict validation: cannot cancel if already Cancelled
    if (letter.status === 'Cancelled' || letter.status === 'Canceled') {
      throw new Error('Surat sudah dalam status dibatalkan (Cancelled)')
    }

    const isAdmin = userRole === 'admin'
    const isDrafter = letter.drafterId === userId

    // Role check: Only the original creator/drafter or Admin can cancel
    if (!isDrafter && !isAdmin) {
      throw new Error('Hanya pembuat surat (Drafter) atau Administrator yang berwenang membatalkan surat ini')
    }

    // Strict validation: Approved letter cannot be cancelled unless Administrator void override
    if (letter.status === 'Approved') {
      if (!isAdmin) {
        throw new Error('Surat yang telah disetujui (Approved) tidak dapat dibatalkan')
      }
    }

    const nowIso = new Date().toISOString()

    // Side-effect: Tag number as Voided/Cancelled in counter repository for audit traceability
    if (letter.letterNumber) {
      await this.counterRepo.tagNumberAsVoided({
        letterNumber: letter.letterNumber,
        letterId: letter.letterId,
        department: 'HR',
        templateType: letter.templateType || 'Surat',
        reason: reason.trim(),
        voidedBy: userName,
        voidedAt: nowIso,
        status: 'Voided/Cancelled',
      })
    }

    // Update letter record: maintain document and its letterNumber, tag as Cancelled + Voided
    const updated = await this.repo.update(letterId, {
      status: 'Cancelled',
      cancellationReason: reason.trim(),
      cancelledAt: nowIso,
      cancelledBy: userName,
      isVoidedNumber: true,
      numberStatus: 'Voided/Cancelled',
      updatedAt: nowIso,
    })

    // Write immutable audit log
    this.audit
      .logDocumentCancelled({
        letterId,
        letterNumber: letter.letterNumber,
        actor: { userId, name: userName, role: userRole },
        reason: reason.trim(),
        previousState: letter.status,
      })
      .catch((err) => console.warn('Gagal mencatat audit log cancelLetter:', err))

    return updated
  }

  /**
   * Menolak dokumen dalam alur persetujuan.
   * - Diinisiasi oleh Reviewer, Approver, atau Administrator.
   * - Strict validation: Dokumen dengan status 'Approved' tidak dapat ditolak.
   * - Dokumen yang sudah 'Cancelled' atau 'Rejected' tidak dapat ditolak lagi.
   * - Alasan penolakan bersifat wajib.
   * - Mencatat rejectionReason, rejectedBy, rejectedAt, serta memperbarui approvalStep.
   */
  async rejectLetter(
    letterId: string,
    userId: string,
    userName: string,
    userRole: string,
    reason: string
  ): Promise<Letter> {
    if (!reason || !reason.trim()) {
      throw new Error('Alasan penolakan dokumen wajib diisi')
    }

    const letter = await this.repo.findById(letterId)
    if (!letter) {
      throw new Error('Surat tidak ditemukan')
    }

    if (letter.status === 'Approved') {
      throw new Error('Dokumen yang telah disetujui (Approved) tidak dapat ditolak')
    }

    if (letter.status === 'Cancelled' || letter.status === 'Canceled') {
      throw new Error('Dokumen yang telah dibatalkan tidak dapat ditolak')
    }

    if (letter.status === 'Rejected') {
      throw new Error('Dokumen sudah dalam status ditolak')
    }

    const isAdmin = userRole === 'admin'
    const isReviewerOrApprover = userRole === 'reviewer' || userRole === 'approver'

    if (!isReviewerOrApprover && !isAdmin) {
      throw new Error('Hanya Reviewer atau Approver yang berwenang menolak dokumen ini')
    }

    const flow = [...(letter.approvalFlow || [])]
    const pendingStepIndex = flow.findIndex((step) => step.status === 'pending')

    const nowIso = new Date().toISOString()
    let reviewerName = userName

    if (pendingStepIndex !== -1) {
      const currentStep = flow[pendingStepIndex]
      if (currentStep.userId !== userId && !isAdmin && !userId.includes(currentStep.role)) {
        throw new Error(
          `Bukan giliran Anda untuk memproses dokumen ini. Saat ini menunggu persetujuan dari ${currentStep.userName} (${currentStep.role})`
        )
      }
      reviewerName = currentStep.userName
      flow[pendingStepIndex] = {
        ...currentStep,
        status: 'rejected',
        notes: reason.trim(),
      }
    }

    const updated = await this.repo.update(letterId, {
      status: 'Rejected',
      approvalFlow: flow,
      rejectionReason: reason.trim(),
      rejectedBy: reviewerName,
      rejectedAt: nowIso,
      updatedAt: nowIso,
    })

    // Send email notification to Drafter
    await this.notificationService.notifyLetterRejected(
      { name: letter.drafterName },
      letter.letterNumber,
      reviewerName,
      reason.trim()
    )

    // Write immutable audit log
    this.audit
      .logDocumentRejected({
        letterId,
        letterNumber: letter.letterNumber,
        actor: { userId, name: reviewerName, role: userRole },
        reason: reason.trim(),
        previousState: letter.status,
      })
      .catch((err) => console.warn('Gagal mencatat audit log rejectLetter:', err))

    return updated
  }

  validateBookingPayload(dto: BookLetterNumberDTO): void {
    if (!dto.templateType || String(dto.templateType).trim() === '') {
      throw new Error('Kategori / Jenis surat wajib dipilih')
    }

    if (!dto.purpose || String(dto.purpose).trim() === '') {
      throw new Error('Deskripsi atau keperluan surat wajib diisi')
    }

    if (!dto.issuedDate || String(dto.issuedDate).trim() === '') {
      throw new Error('Tanggal penerbitan surat wajib diisi')
    }
  }

  async bookLetterNumber(
    dto: BookLetterNumberDTO,
    userId: string,
    userName: string
  ): Promise<Letter> {
    this.validateBookingPayload(dto)

    const issuedDateObj = new Date(dto.issuedDate)
    const validDate = isNaN(issuedDateObj.getTime()) ? new Date() : issuedDateObj
    const month = validDate.getMonth() + 1
    const year = validDate.getFullYear()
    const dept = 'HR'

    const templateConfig = LETTER_TEMPLATES[dto.templateType]
    const letterCode = templateConfig ? templateConfig.code : 'LTR'

    // Ambil sequence atomic dari counter repository
    const nextSequence = await this.counterRepo.getNextSequenceNumber(dept, month, year)
    const letterNumber = this.formatLetterNumber(nextSequence, letterCode, validDate)
    const nowIso = new Date().toISOString()

    const bookedLetterData: Omit<Letter, 'letterId'> = {
      letterNumber,
      templateType: dto.templateType,
      contentData: {
        purpose: dto.purpose,
        issuedDate: dto.issuedDate,
        isStandaloneBooking: 'true',
      },
      status: 'Booked',
      drafterId: userId,
      drafterName: userName,
      approvalFlow: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    const created = await this.repo.create(bookedLetterData)

    // Write immutable audit log
    this.audit
      .logDocumentCreated({
        letterId: created.letterId,
        letterNumber: created.letterNumber,
        templateType: created.templateType,
        actor: { userId, name: userName, role: 'drafter' },
        initialState: 'Booked',
      })
      .catch((err) => console.warn('Gagal mencatat audit log bookLetterNumber:', err))

    return created
  }

  async retryPdfProcessing(letterId: string): Promise<Letter> {
    const letter = await this.repo.findById(letterId)
    if (!letter) {
      throw new Error('Surat tidak ditemukan')
    }

    if (letter.status !== 'Error PDF') {
      throw new Error(`Hanya surat dengan status Error PDF yang dapat diproses ulang (status saat ini: ${letter.status})`)
    }

    const updated = await this.repo.update(letterId, {
      status: 'Processing PDF',
      pdfError: undefined,
      updatedAt: new Date().toISOString(),
    })

    if (!isFirebaseConfigured) {
      setTimeout(async () => {
        try {
          const bucketName = 'koneksi-app-dev.appspot.com'
          const mockPdfUrl = `https://storage.googleapis.com/${bucketName}/final_letters/${letterId}.pdf`
          await this.repo.update(letterId, {
            status: 'Approved',
            finalPdfUrl: mockPdfUrl,
            pdfError: undefined,
          })
        } catch (err) {
          console.warn('Simulasi PDF retry generation gagal:', err)
        }
      }, 2000)
    }

    return updated
  }

  /**
   * Fetches real-time aggregate statistics from the repository.
   */
  async getAggregateMetrics(): Promise<LetterMetrics> {
    return this.repo.getAggregateMetrics()
  }

  /**
   * Subscribes to real-time aggregate statistics.
   */
  subscribeMetrics(callback: (metrics: LetterMetrics) => void): () => void {
    return this.repo.subscribeMetrics(callback)
  }

  /**
   * Calculates metrics from an array of letters (in-memory).
   */
  calculateMetrics(letters: Letter[]): LetterMetrics {
    const total = letters.length
    const totalDrafts = letters.filter((l) => l.status === 'Draft').length
    const inReview = letters.filter((l) => l.status === 'In Review').length
    const processing = letters.filter((l) => l.status === 'Processing PDF').length
    const pendingApprovals = inReview + processing
    const rejected = letters.filter((l) => l.status === 'Rejected').length
    const completed = letters.filter((l) => l.status === 'Approved').length
    const booked = letters.filter((l) => l.status === 'Booked').length
    const cancelled = letters.filter((l) => l.status === 'Cancelled' || l.status === 'Canceled').length

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
}

export const letterService = new LetterService(letterRepository, counterRepository)
