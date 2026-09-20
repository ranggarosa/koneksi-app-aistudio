import { describe, it, expect, vi } from 'vitest'
import { LetterService } from './letter.service'
import type { ILetterRepository } from './letter.repository'
import type { ICounterRepository } from './counter.repository'
import type { Letter } from './letter.model'

describe('LetterService - Dashboard Aggregate Metrics', () => {
  const mockLetters: Letter[] = [
    {
      letterId: 'ltr_1',
      letterNumber: '001/ST/2026',
      templateType: 'Surat Tugas',
      contentData: {},
      status: 'Draft',
      drafterId: 'd1',
      drafterName: 'Drafter 1',
      createdAt: '2026-09-01',
      updatedAt: '2026-09-01',
      approvalFlow: [],
    },
    {
      letterId: 'ltr_2',
      letterNumber: '002/ST/2026',
      templateType: 'Surat Tugas',
      contentData: {},
      status: 'In Review',
      drafterId: 'd1',
      drafterName: 'Drafter 1',
      createdAt: '2026-09-02',
      updatedAt: '2026-09-02',
      approvalFlow: [],
    },
    {
      letterId: 'ltr_3',
      letterNumber: '003/ST/2026',
      templateType: 'Surat Keterangan',
      contentData: {},
      status: 'Approved',
      drafterId: 'd2',
      drafterName: 'Drafter 2',
      createdAt: '2026-09-03',
      updatedAt: '2026-09-03',
      approvalFlow: [],
    },
    {
      letterId: 'ltr_4',
      letterNumber: '004/ST/2026',
      templateType: 'Surat Keterangan',
      contentData: {},
      status: 'Rejected',
      drafterId: 'd2',
      drafterName: 'Drafter 2',
      createdAt: '2026-09-04',
      updatedAt: '2026-09-04',
      approvalFlow: [],
    },
  ]

  it('calculates exact aggregate counts for Drafts, In Review, Approved, and Rejected', () => {
    const mockLetterRepo: Partial<ILetterRepository> = {}
    const mockCounterRepo: Partial<ICounterRepository> = {}
    const service = new LetterService(mockLetterRepo as ILetterRepository, mockCounterRepo as ICounterRepository)

    const metrics = service.calculateMetrics(mockLetters)

    expect(metrics.total).toBe(4)
    expect(metrics.totalDrafts).toBe(1)
    expect(metrics.draftCount).toBe(1)
    expect(metrics.pendingApprovals).toBe(1)
    expect(metrics.inReviewCount).toBe(1)
    expect(metrics.completed).toBe(1)
    expect(metrics.approvedCount).toBe(1)
    expect(metrics.rejected).toBe(1)
    expect(metrics.rejectedCount).toBe(1)
  })
})
