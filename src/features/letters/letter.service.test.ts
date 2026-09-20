import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LetterService } from './letter.service'
import type { ILetterRepository } from './letter.repository'
import type { ICounterRepository } from './counter.repository'
import type { Letter } from './letter.model'

describe('LetterService - Approval Workflow (Business Logic)', () => {
  let mockLetterRepo: ILetterRepository
  let mockCounterRepo: ICounterRepository
  let letterService: LetterService

  const initialLetter: Letter = {
    letterId: 'ltr_srv_001',
    letterNumber: '001/ST/HR/IX/2026',
    templateType: 'Surat Tugas',
    contentData: { nama: 'Budi' },
    status: 'In Review',
    drafterId: 'drafter_01',
    drafterName: 'Drafter User',
    createdAt: '2026-09-05T00:00:00Z',
    updatedAt: '2026-09-05T00:00:00Z',
    approvalFlow: [
      {
        userId: 'rev_01',
        userName: 'Reviewer Satu',
        role: 'reviewer',
        status: 'pending',
      },
      {
        userId: 'app_final',
        userName: 'Approver Final',
        role: 'approver',
        status: 'pending',
      },
    ],
  }

  beforeEach(() => {
    mockLetterRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockImplementation((_id, data) => Promise.resolve({ ...initialLetter, ...data })),
      subscribeById: vi.fn(),
    }

    mockCounterRepo = {
      getNextSequenceNumber: vi.fn().mockResolvedValue(1),
    }

    letterService = new LetterService(mockLetterRepo, mockCounterRepo)
  })

  it('keeps status as "In Review" when Reviewer 1 approves and subsequent approver is still pending', async () => {
    vi.spyOn(mockLetterRepo, 'findById').mockResolvedValue({ ...initialLetter })

    const result = await letterService.processApproval('ltr_srv_001', 'rev_01', 'approve')

    expect(mockLetterRepo.update).toHaveBeenCalledWith(
      'ltr_srv_001',
      expect.objectContaining({
        status: 'In Review',
        approvalFlow: expect.arrayContaining([
          expect.objectContaining({ userId: 'rev_01', status: 'approved' }),
          expect.objectContaining({ userId: 'app_final', status: 'pending' }),
        ]),
      })
    )
    expect(result.status).toBe('In Review')
  })

  it('transitions status to "Processing PDF" when the FINAL approver approves', async () => {
    const letterAtFinalStep: Letter = {
      ...initialLetter,
      approvalFlow: [
        {
          userId: 'rev_01',
          userName: 'Reviewer Satu',
          role: 'reviewer',
          status: 'approved',
          signedAt: '2026-09-05T01:00:00Z',
        },
        {
          userId: 'app_final',
          userName: 'Approver Final',
          role: 'approver',
          status: 'pending',
        },
      ],
    }
    vi.spyOn(mockLetterRepo, 'findById').mockResolvedValue(letterAtFinalStep)

    const result = await letterService.processApproval('ltr_srv_001', 'app_final', 'approve')

    expect(mockLetterRepo.update).toHaveBeenCalledWith(
      'ltr_srv_001',
      expect.objectContaining({
        status: 'Processing PDF',
        approvalFlow: expect.arrayContaining([
          expect.objectContaining({ userId: 'app_final', status: 'approved' }),
        ]),
      })
    )
    expect(result.status).toBe('Processing PDF')
  })

  it('transitions status to "Rejected" when ANY reviewer/approver rejects the document', async () => {
    vi.spyOn(mockLetterRepo, 'findById').mockResolvedValue({ ...initialLetter })

    const result = await letterService.processApproval(
      'ltr_srv_001',
      'rev_01',
      'reject',
      'Format data salah'
    )

    expect(mockLetterRepo.update).toHaveBeenCalledWith(
      'ltr_srv_001',
      expect.objectContaining({
        status: 'Rejected',
        approvalFlow: expect.arrayContaining([
          expect.objectContaining({
            userId: 'rev_01',
            status: 'rejected',
            notes: 'Format data salah',
          }),
        ]),
      })
    )
    expect(result.status).toBe('Rejected')
  })

  it('throws an error if a user tries to approve out of turn', async () => {
    vi.spyOn(mockLetterRepo, 'findById').mockResolvedValue({ ...initialLetter })

    // rev_01 is pending, but app_final tries to act
    await expect(
      letterService.processApproval('ltr_srv_001', 'app_final', 'approve')
    ).rejects.toThrow(/Bukan giliran Anda/i)
  })

  it('allows retryPdfProcessing to reset status from "Error PDF" back to "Processing PDF"', async () => {
    const errorLetter: Letter = {
      ...initialLetter,
      status: 'Error PDF',
      pdfError: 'Drive timeout',
    }
    vi.spyOn(mockLetterRepo, 'findById').mockResolvedValue(errorLetter)

    await letterService.retryPdfProcessing('ltr_srv_001')

    expect(mockLetterRepo.update).toHaveBeenCalledWith('ltr_srv_001', {
      status: 'Processing PDF',
      pdfError: undefined,
      updatedAt: expect.any(String),
    })
  })
})
