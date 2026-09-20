import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Sidebar } from '@/components/common/Sidebar'
import { LetterDashboardView } from './LetterDashboardView'
import * as authController from '@/features/auth/auth.controller'
import * as letterController from './letter.controller'

vi.mock('@/features/auth/auth.controller')
vi.mock('./letter.controller')

describe('Role-Based UI (Drafter vs Reviewer/Approver)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(letterController, 'useLetterDashboardController').mockReturnValue({
      letters: [],
      loading: false,
      error: null,
      searchQuery: '',
      setSearchQuery: vi.fn(),
      statusFilter: 'All',
      setStatusFilter: vi.fn(),
      metrics: {
        total: 0,
        draftCount: 0,
        inReviewCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        bookedCount: 0,
        processingPdfCount: 0,
        errorPdfCount: 0,
      },
    } as any)
  })

  it('renders "Buat Surat" navigation link in Sidebar when user is Drafter', () => {
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'drafter_1',
        name: 'Drafter User',
        role: 'drafter',
        email: 'drafter@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
      canCreateLetter: true,
      canReviewLetter: false,
      canApproveLetter: false,
    } as any)

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByText('Buat Surat')).toBeInTheDocument()
    expect(screen.getByText('Ambil Nomor')).toBeInTheDocument()
  })

  it('HIDES "Buat Surat" navigation link in Sidebar when user is Reviewer/Approver', () => {
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'approver_1',
        name: 'Approver Head',
        role: 'approver',
        email: 'approver@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
      canCreateLetter: false,
      canReviewLetter: false,
      canApproveLetter: true,
    } as any)

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.queryByText('Buat Surat')).not.toBeInTheDocument()
    expect(screen.queryByText('Ambil Nomor')).not.toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders "Buat Surat Baru" button in Dashboard when user is Drafter', () => {
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'drafter_1',
        name: 'Drafter User',
        role: 'drafter',
        email: 'drafter@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
      canCreateLetter: true,
    } as any)

    render(
      <MemoryRouter>
        <LetterDashboardView />
      </MemoryRouter>
    )

    expect(screen.getByText('Buat Surat Baru')).toBeInTheDocument()
    expect(screen.getByText('Ambil Nomor Surat')).toBeInTheDocument()
  })

  it('HIDES "Buat Surat Baru" button in Dashboard when user is Reviewer/Approver', () => {
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'reviewer_1',
        name: 'Reviewer User',
        role: 'reviewer',
        email: 'reviewer@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
      canCreateLetter: false,
    } as any)

    render(
      <MemoryRouter>
        <LetterDashboardView />
      </MemoryRouter>
    )

    expect(screen.queryByText('Buat Surat Baru')).not.toBeInTheDocument()
    expect(screen.queryByText('Ambil Nomor Surat')).not.toBeInTheDocument()
  })
})
