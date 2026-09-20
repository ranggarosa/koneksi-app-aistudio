import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'
import * as authController from '@/features/auth/auth.controller'

vi.mock('@/features/auth/auth.controller')

describe('ProtectedRoute (Auth Guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays loading screen while verifying user session', () => {
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: null,
      loading: true,
      canCreateLetter: false,
      canReviewLetter: false,
      canApproveLetter: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    } as any)

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText(/Memverifikasi sesi pengguna/i)).toBeInTheDocument()
  })

  it('redirects unauthenticated user (user is null) to /login', () => {
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: null,
      loading: false,
      canCreateLetter: false,
      canReviewLetter: false,
      canApproveLetter: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    } as any)

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Dashboard')).not.toBeInTheDocument()
  })

  it('renders protected child component when user is authenticated', () => {
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'user_drafter_1',
        email: 'drafter@example.com',
        name: 'Rangga Drafter',
        role: 'drafter',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
      canCreateLetter: true,
      canReviewLetter: false,
      canApproveLetter: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    } as any)

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Protected Dashboard Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })
})
