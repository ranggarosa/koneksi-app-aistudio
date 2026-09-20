export type LetterStatus =
  | 'Draft'
  | 'In Review'
  | 'Approved'
  | 'Rejected'
  | 'Booked'
  | 'Cancelled'
  | 'Canceled'
  | 'Processing PDF'
  | 'Error PDF'

export type LetterTemplateType = 'Surat Tugas' | 'SP 1' | 'SP 2'

export interface LetterTemplateConfig {
  type: string
  code: string // KODE_SURAT (misal: ST, SP1, SP2)
  label: string
  googleDocTemplateId?: string
}

export const LETTER_TEMPLATES: Record<string, LetterTemplateConfig> = {
  'Surat Tugas': {
    type: 'Surat Tugas',
    code: 'ST',
    label: 'Surat Tugas',
    googleDocTemplateId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  },
  'SP 1': {
    type: 'SP 1',
    code: 'SP1',
    label: 'Surat Peringatan 1 (SP 1)',
    googleDocTemplateId: '1z7sXqY6tBkWXU4P2R_vD2WfK1M9V8nLx5jZ8gQ9_abc',
  },
  'SP 2': {
    type: 'SP 2',
    code: 'SP2',
    label: 'Surat Peringatan 2 (SP 2)',
    googleDocTemplateId: '1k8mNpQ3rTuVwXyZ5A6B7C8D9E0F1G2H3I4J5K6L_xyz',
  },
}

export interface ApprovalStep {
  userId: string
  userName: string
  role: 'reviewer' | 'approver'
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  signedAt?: string
}

export interface Letter {
  letterId: string
  letterNumber: string
  templateType: string
  googleDocTemplateId?: string
  contentData: Record<string, string | number>
  status: LetterStatus
  drafterId: string
  drafterName: string
  approvalFlow: ApprovalStep[]
  finalPdfUrl?: string
  pdfError?: string
  cancellationReason?: string
  cancelledAt?: string
  cancelledBy?: string
  rejectionReason?: string
  rejectedAt?: string
  rejectedBy?: string
  isVoidedNumber?: boolean
  numberStatus?: 'Active' | 'Voided/Cancelled' | 'Cancelled'
  createdAt: string
  updatedAt: string
}

export interface LetterMetrics {
  total: number
  totalDrafts: number // Total Drafts
  pendingApprovals: number // Pending Approvals ('In Review', 'Processing PDF')
  rejected: number // Rejected
  completed: number // Completed documents ('Approved')
  // Aliases for backwards compatibility
  draftCount: number
  inReviewCount: number
  approvedCount: number
  rejectedCount: number
  bookedCount?: number
  cancelledCount?: number
}

export interface Counter {
  counterId: string
  department: string
  month: number
  year: number
  currentSequence: number
  updatedAt?: string
}

export interface ApproverOption {
  uid: string
  name: string
  role: string
  department?: string
}

export interface CreateLetterDTO {
  templateType: string
  department?: string
  jenisSurat?: string
  googleDocTemplateId?: string
  contentData: Record<string, string | number>
  reviewerId?: string
  approverId: string
}

export interface LetterFilter {
  status?: LetterStatus
  templateType?: string
  search?: string
}

export interface BookLetterNumberDTO {
  templateType: string
  issuedDate: string
  purpose: string
}

export interface BookedLetterResult {
  letterId: string
  letterNumber: string
  templateType: string
  purpose: string
  issuedDate: string
  bookedBy: string
  createdAt: string
}
