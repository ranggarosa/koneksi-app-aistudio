export interface NotificationLog {
  id: string
  toName: string
  toEmail: string
  subject: string
  body: string
  type: 'approval_request' | 'approval_complete' | 'letter_rejected'
  timestamp: string
}

export interface IEmailNotificationService {
  notifyNextApprover(
    recipient: { name: string; email?: string; role: string },
    letterNumber: string,
    templateType: string
  ): Promise<NotificationLog>
  notifyApprovalComplete(
    drafter: { name: string; email?: string },
    letterNumber: string,
    templateType: string
  ): Promise<NotificationLog>
  notifyLetterRejected(
    drafter: { name: string; email?: string },
    letterNumber: string,
    rejectedBy: string,
    notes?: string
  ): Promise<NotificationLog>
  getSentLogs(): NotificationLog[]
}

export class EmailNotificationService implements IEmailNotificationService {
  private sentLogs: NotificationLog[] = []

  async notifyNextApprover(
    recipient: { name: string; email?: string; role: string },
    letterNumber: string,
    templateType: string
  ): Promise<NotificationLog> {
    const toEmail = recipient.email || `${recipient.name.toLowerCase().replace(/\s+/g, '.')}@koneksi.app`
    const subject = `[Koneksi] Permohonan Persetujuan: ${letterNumber} (${templateType})`
    const body = `Halo ${recipient.name},\n\nAnda memiliki dokumen surat baru (${templateType}) dengan nomor ${letterNumber} yang memerlukan peninjauan dan persetujuan Anda sebagai ${recipient.role.toUpperCase()}.\n\nSilakan buka aplikasi Koneksi untuk meninjau detail surat dan memberikan keputusan otorisasi.\n\nSalam,\nSistem Manajemen Surat Koneksi`

    const log: NotificationLog = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      toName: recipient.name,
      toEmail,
      subject,
      body,
      type: 'approval_request',
      timestamp: new Date().toISOString(),
    }

    this.sentLogs.push(log)
    console.info(`📧 [EMAIL SENT TO ${log.toName} (${log.toEmail})]: "${log.subject}"`)
    return log
  }

  async notifyApprovalComplete(
    drafter: { name: string; email?: string },
    letterNumber: string,
    templateType: string
  ): Promise<NotificationLog> {
    const toEmail = drafter.email || `${drafter.name.toLowerCase().replace(/\s+/g, '.')}@koneksi.app`
    const subject = `[Koneksi] Surat Telah Disetujui: ${letterNumber}`
    const body = `Halo ${drafter.name},\n\nSelamat! Surat ${templateType} dengan nomor ${letterNumber} yang Anda ajukan telah disetujui sepenuhnya oleh seluruh pejabat yang berwenang.\n\nDokumen resmi kini siap diunduh dan diterbitkan.\n\nSalam,\nSistem Manajemen Surat Koneksi`

    const log: NotificationLog = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      toName: drafter.name,
      toEmail,
      subject,
      body,
      type: 'approval_complete',
      timestamp: new Date().toISOString(),
    }

    this.sentLogs.push(log)
    console.info(`📧 [EMAIL SENT TO ${log.toName} (${log.toEmail})]: "${log.subject}"`)
    return log
  }

  async notifyLetterRejected(
    drafter: { name: string; email?: string },
    letterNumber: string,
    rejectedBy: string,
    notes?: string
  ): Promise<NotificationLog> {
    const toEmail = drafter.email || `${drafter.name.toLowerCase().replace(/\s+/g, '.')}@koneksi.app`
    const subject = `[Koneksi] Surat Ditolak: ${letterNumber}`
    const body = `Halo ${drafter.name},\n\nSurat dengan nomor ${letterNumber} telah ditolak oleh ${rejectedBy}.\n\nCatatan Evaluasi: "${notes || 'Tidak ada catatan revisi yang dilampirkan.'}"\n\nSilakan periksa kembali draf surat Anda pada aplikasi Koneksi.\n\nSalam,\nSistem Manajemen Surat Koneksi`

    const log: NotificationLog = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      toName: drafter.name,
      toEmail,
      subject,
      body,
      type: 'letter_rejected',
      timestamp: new Date().toISOString(),
    }

    this.sentLogs.push(log)
    console.info(`📧 [EMAIL SENT TO ${log.toName} (${log.toEmail})]: "${log.subject}"`)
    return log
  }

  getSentLogs(): NotificationLog[] {
    return [...this.sentLogs]
  }
}

export const emailNotificationService = new EmailNotificationService()
