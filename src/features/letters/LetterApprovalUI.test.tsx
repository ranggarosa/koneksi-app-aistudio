import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LetterDetailView } from './LetterDetailView'
import * as authController from '@/features/auth/auth.controller'
import * as detailController from './letter-detail.controller'
import type { Letter } from './letter.model'

vi.mock('@/features/auth/auth.controller')
vi.mock('./letter-detail.controller')

describe('Approval UI (LetterDetailView)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseLetter: Letter = {
    letterId: 'ltr_test_100',
    letterNumber: '001/ST/HR/IX/2026',
    templateType: 'Surat Tugas',
    contentData: { nama: 'Andi' },
    status: 'In Review',
    drafterId: 'drafter_01',
    drafterName: 'Rangga Drafter',
    createdAt: '2026-09-05T08:00:00Z',
    updatedAt: '2026-09-05T08:00:00Z',
    approvalFlow: [
      {
        userId: 'rev_01',
        userName: 'Reviewer Satu',
        role: 'reviewer',
        status: 'approved',
        signedAt: '2026-09-05T09:00:00Z',
      },
      {
        userId: 'app_01',
        userName: 'Approver Final',
        role: 'approver',
        status: 'pending',
      },
    ],
  }

  it('RENDERS Approve and Reject buttons when current user turn is pending and prior step is approved', () => {
    // Current user is Approver Final (whose turn is pending)
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'app_01',
        name: 'Approver Final',
        role: 'approver',
        email: 'approver@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
    } as any)

    vi.spyOn(detailController, 'useLetterDetailController').mockReturnValue({
      letter: baseLetter,
      loading: false,
      actionLoading: false,
      error: null,
      feedbackMsg: null,
      clearFeedback: vi.fn(),
      handleAction: vi.fn(),
      handleCancelDocument: vi.fn(),
      handleRejectDocument: vi.fn(),
      handleRetryPdf: vi.fn(),
    } as any)

    render(
      <MemoryRouter>
        <LetterDetailView />
      </MemoryRouter>
    )

    // Action buttons must be visible
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })

  it('HIDES Approve and Reject buttons when current user has ALREADY approved', () => {
    // Current user is Reviewer Satu (who already approved)
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'rev_01',
        name: 'Reviewer Satu',
        role: 'reviewer',
        email: 'reviewer@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
    } as any)

    vi.spyOn(detailController, 'useLetterDetailController').mockReturnValue({
      letter: baseLetter,
      loading: false,
      actionLoading: false,
      error: null,
      feedbackMsg: null,
      clearFeedback: vi.fn(),
      handleAction: vi.fn(),
      handleCancelDocument: vi.fn(),
      handleRejectDocument: vi.fn(),
      handleRetryPdf: vi.fn(),
    } as any)

    render(
      <MemoryRouter>
        <LetterDetailView />
      </MemoryRouter>
    )

    // Action buttons must NOT be present
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()

    // Must show waiting indicator for the other person
    expect(screen.getByText(/Menunggu Peninjauan/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Approver Final/i).length).toBeGreaterThanOrEqual(1)
  })

  it('HIDES Approve and Reject buttons when status is Processing PDF', () => {
    const processingLetter: Letter = {
      ...baseLetter,
      status: 'Processing PDF',
      approvalFlow: [
        {
          userId: 'rev_01',
          userName: 'Reviewer Satu',
          role: 'reviewer',
          status: 'approved',
        },
        {
          userId: 'app_01',
          userName: 'Approver Final',
          role: 'approver',
          status: 'approved',
        },
      ],
    }

    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'app_01',
        name: 'Approver Final',
        role: 'approver',
        email: 'approver@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
    } as any)

    vi.spyOn(detailController, 'useLetterDetailController').mockReturnValue({
      letter: processingLetter,
      loading: false,
      actionLoading: false,
      error: null,
      feedbackMsg: null,
      clearFeedback: vi.fn(),
      handleAction: vi.fn(),
      handleCancelDocument: vi.fn(),
      handleRejectDocument: vi.fn(),
      handleRetryPdf: vi.fn(),
    } as any)

    render(
      <MemoryRouter>
        <LetterDetailView />
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Dokumen Sedang Diproses Server/i)).toBeInTheDocument()
  })

  it('RENDERS Cancel Document button for the original drafter during In Review', () => {
    // Current user is Drafter
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'drafter_01',
        name: 'Rangga Drafter',
        role: 'drafter',
        email: 'drafter@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
    } as any)

    vi.spyOn(detailController, 'useLetterDetailController').mockReturnValue({
      letter: baseLetter,
      loading: false,
      actionLoading: false,
      error: null,
      feedbackMsg: null,
      clearFeedback: vi.fn(),
      handleAction: vi.fn(),
      handleCancelDocument: vi.fn(),
      handleRejectDocument: vi.fn(),
      handleRetryPdf: vi.fn(),
    } as any)

    render(
      <MemoryRouter>
        <LetterDetailView />
      </MemoryRouter>
    )

    // Drafter can see "Cancel Document" button
    expect(screen.getAllByRole('button', { name: /cancel document/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('RENDERS Void / Cancel Document button for Admin even if letter is Approved', () => {
    const approvedLetter: Letter = {
      ...baseLetter,
      status: 'Approved',
    }

    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'admin_01',
        name: 'Super Admin',
        role: 'admin',
        email: 'admin@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
    } as any)

    vi.spyOn(detailController, 'useLetterDetailController').mockReturnValue({
      letter: approvedLetter,
      loading: false,
      actionLoading: false,
      error: null,
      feedbackMsg: null,
      clearFeedback: vi.fn(),
      handleAction: vi.fn(),
      handleCancelDocument: vi.fn(),
      handleRejectDocument: vi.fn(),
      handleRetryPdf: vi.fn(),
    } as any)

    render(
      <MemoryRouter>
        <LetterDetailView />
      </MemoryRouter>
    )

    // Admin should see Void / Cancel Document override button
    expect(screen.getByRole('button', { name: /void \/ cancel document \(admin override\)/i })).toBeInTheDocument()
  })

  it('OPENS Confirmation Modal with mandatory reason validation when Cancel Document is clicked', async () => {
    const mockCancel = vi.fn().mockResolvedValue(true)

    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'drafter_01',
        name: 'Rangga Drafter',
        role: 'drafter',
        email: 'drafter@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
    } as any)

    vi.spyOn(detailController, 'useLetterDetailController').mockReturnValue({
      letter: baseLetter,
      loading: false,
      actionLoading: false,
      error: null,
      feedbackMsg: null,
      clearFeedback: vi.fn(),
      handleAction: vi.fn(),
      handleCancelDocument: mockCancel,
      handleRejectDocument: vi.fn(),
      handleRetryPdf: vi.fn(),
    } as any)

    render(
      <MemoryRouter>
        <LetterDetailView />
      </MemoryRouter>
    )

    // Click "Cancel Document" button
    const cancelBtn = screen.getAllByRole('button', { name: /cancel document/i })[0]
    fireEvent.click(cancelBtn)

    // Modal dialog must appear
    expect(screen.getByRole('heading', { name: /konfirmasi pembatalan surat/i })).toBeInTheDocument()
    expect(screen.getByText(/Catatan Audit:/i)).toBeInTheDocument()

    // Try submitting without reason
    const submitBtn = screen.getByRole('button', { name: /konfirmasi pembatalan/i })
    fireEvent.click(submitBtn)

    // Must block and show error
    expect(screen.getByText(/alasan pembatalan surat wajib diisi/i)).toBeInTheDocument()
    expect(mockCancel).not.toHaveBeenCalled()

    // Fill in mandatory reason
    const textarea = screen.getByPlaceholderText(/masukkan alasan pembatalan surat/i)
    fireEvent.change(textarea, { target: { value: 'Acara resmi dibatalkan oleh pimpinan.' } })

    // Submit with reason filled
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockCancel).toHaveBeenCalledWith(
        'drafter_01',
        'Rangga Drafter',
        'drafter',
        'Acara resmi dibatalkan oleh pimpinan.'
      )
    })
  })

  it('OPENS Confirmation Modal with mandatory reason validation when Reject is clicked', async () => {
    const mockReject = vi.fn().mockResolvedValue(true)

    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'app_01',
        name: 'Approver Final',
        role: 'approver',
        email: 'approver@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
    } as any)

    vi.spyOn(detailController, 'useLetterDetailController').mockReturnValue({
      letter: baseLetter,
      loading: false,
      actionLoading: false,
      error: null,
      feedbackMsg: null,
      clearFeedback: vi.fn(),
      handleAction: vi.fn(),
      handleCancelDocument: vi.fn(),
      handleRejectDocument: mockReject,
      handleRetryPdf: vi.fn(),
    } as any)

    render(
      <MemoryRouter>
        <LetterDetailView />
      </MemoryRouter>
    )

    // Click "Reject" button
    const rejectBtn = screen.getByRole('button', { name: /reject/i })
    fireEvent.click(rejectBtn)

    // Modal dialog must appear
    expect(screen.getByRole('heading', { name: /konfirmasi penolakan dokumen/i })).toBeInTheDocument()

    // Try submitting without reason
    const confirmRejectBtn = screen.getByRole('button', { name: /konfirmasi penolakan/i })
    fireEvent.click(confirmRejectBtn)

    // Must block and show error
    expect(screen.getByText(/alasan penolakan dokumen wajib diisi/i)).toBeInTheDocument()
    expect(mockReject).not.toHaveBeenCalled()

    // Fill in evaluation reason
    const textarea = screen.getByPlaceholderText(/masukkan catatan evaluasi atau alasan penolakan/i)
    fireEvent.change(textarea, { target: { value: 'Format lampiran belum memenuhi regulasi terbaru.' } })

    // Submit with reason filled
    fireEvent.click(confirmRejectBtn)

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith(
        'app_01',
        'Approver Final',
        'approver',
        'Format lampiran belum memenuhi regulasi terbaru.'
      )
    })
  })

  it('DISPLAYS Cancelled audit details when document status is Cancelled', () => {
    const cancelledLetter: Letter = {
      ...baseLetter,
      status: 'Cancelled',
      cancelledBy: 'Rangga Drafter',
      cancelledAt: '2026-09-06T10:00:00Z',
      cancellationReason: 'Perubahan agenda internal organisasi',
      isVoidedNumber: true,
      numberStatus: 'Voided/Cancelled',
    }

    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'drafter_01',
        name: 'Rangga Drafter',
        role: 'drafter',
        email: 'drafter@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
    } as any)

    vi.spyOn(detailController, 'useLetterDetailController').mockReturnValue({
      letter: cancelledLetter,
      loading: false,
      actionLoading: false,
      error: null,
      feedbackMsg: null,
      clearFeedback: vi.fn(),
      handleAction: vi.fn(),
      handleCancelDocument: vi.fn(),
      handleRejectDocument: vi.fn(),
      handleRetryPdf: vi.fn(),
    } as any)

    render(
      <MemoryRouter>
        <LetterDetailView />
      </MemoryRouter>
    )

    // Must display Cancelled indicators and audit traceability text
    expect(screen.getByText(/dokumen dibatalkan \(cancelled\)/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Perubahan agenda internal organisasi/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Tercatat dalam Audit Log/i)).toBeInTheDocument()
  })
})

