import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EmailNotificationService } from './email-notification.service'

describe('EmailNotificationService', () => {
  let service: EmailNotificationService

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    service = new EmailNotificationService()
  })

  describe('notifyNextApprover', () => {
    it('sends notification with provided email', async () => {
      const log = await service.notifyNextApprover(
        { name: 'Dr. Hendra', email: 'hendra@koneksi.app', role: 'approver' },
        '001/ST/HR/IX/2026',
        'Surat Tugas'
      )

      expect(log.toName).toBe('Dr. Hendra')
      expect(log.toEmail).toBe('hendra@koneksi.app')
      expect(log.subject).toContain('Permohonan Persetujuan: 001/ST/HR/IX/2026')
      expect(log.subject).toContain('Surat Tugas')
      expect(log.body).toContain('APPROVER')
      expect(log.type).toBe('approval_request')
      expect(service.getSentLogs()).toHaveLength(1)
    })

    it('generates fallback email if email is not provided', async () => {
      const log = await service.notifyNextApprover(
        { name: 'Ahmad Drafter', role: 'reviewer' },
        '002/ND/OP/IX/2026',
        'Nota Dinas'
      )

      expect(log.toEmail).toBe('ahmad.drafter@koneksi.app')
      expect(log.body).toContain('REVIEWER')
    })
  })

  describe('notifyApprovalComplete', () => {
    it('sends completion notification to drafter', async () => {
      const log = await service.notifyApprovalComplete(
        { name: 'Budi Drafter', email: 'budi@koneksi.app' },
        '003/ST/HR/IX/2026',
        'Surat Tugas'
      )

      expect(log.toName).toBe('Budi Drafter')
      expect(log.toEmail).toBe('budi@koneksi.app')
      expect(log.subject).toBe('[Koneksi] Surat Telah Disetujui: 003/ST/HR/IX/2026')
      expect(log.body).toContain('telah disetujui sepenuhnya')
      expect(log.type).toBe('approval_complete')
    })
  })

  describe('notifyLetterRejected', () => {
    it('sends rejection notification with review notes', async () => {
      const log = await service.notifyLetterRejected(
        { name: 'Budi Drafter', email: 'budi@koneksi.app' },
        '004/SK/DIR/IX/2026',
        'Dr. Hendra (Approver)',
        'Perbaiki lampiran anggaran pada halaman 2.'
      )

      expect(log.toName).toBe('Budi Drafter')
      expect(log.subject).toBe('[Koneksi] Surat Ditolak: 004/SK/DIR/IX/2026')
      expect(log.body).toContain('ditolak oleh Dr. Hendra (Approver)')
      expect(log.body).toContain('Perbaiki lampiran anggaran pada halaman 2.')
      expect(log.type).toBe('letter_rejected')
    })

    it('sends rejection notification with default fallback note when omitted', async () => {
      const log = await service.notifyLetterRejected(
        { name: 'Budi Drafter' },
        '005/SK/DIR/IX/2026',
        'Reviewer'
      )

      expect(log.body).toContain('Tidak ada catatan revisi yang dilampirkan.')
      expect(log.toEmail).toBe('budi.drafter@koneksi.app')
    })
  })

  describe('getSentLogs', () => {
    it('returns an immutable copy of all accumulated logs', async () => {
      await service.notifyNextApprover(
        { name: 'Approver 1', role: 'approver' },
        '001/ST/HR/IX/2026',
        'Surat Tugas'
      )
      await service.notifyApprovalComplete(
        { name: 'Drafter 1' },
        '001/ST/HR/IX/2026',
        'Surat Tugas'
      )

      const logs = service.getSentLogs()
      expect(logs).toHaveLength(2)

      // Modifying returned array does not mutate internal logs
      logs.pop()
      expect(service.getSentLogs()).toHaveLength(2)
    })
  })
})
