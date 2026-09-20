import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoleRoute } from './RoleRoute'
import * as authController from '@/features/auth/auth.controller'

vi.mock('@/features/auth/auth.controller')

describe('RoleRoute (Role-Based Access Control Guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows access to user whose role matches allowedRoles', () => {
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'user_app_1',
        email: 'approver@example.com',
        displayName: 'Approver One',
        role: 'approver',
        createdAt: '2026-09-06T00:00:00Z',
      },
      loading: false,
    } as any)

    render(
      <MemoryRouter initialEntries={['/approval']}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard Fallback</div>} />
          <Route element={<RoleRoute allowedRoles={['approver', 'reviewer']} />}>
            <Route path="/approval" element={<div>Approval Console</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Approval Console')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard Fallback')).not.toBeInTheDocument()
  })

  it('allows access to Admin regardless of allowedRoles', () => {
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'user_admin',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'admin',
        createdAt: '2026-09-06T00:00:00Z',
      },
      loading: false,
    } as any)

    render(
      <MemoryRouter initialEntries={['/approval']}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard Fallback</div>} />
          <Route element={<RoleRoute allowedRoles={['reviewer']} />}>
            <Route path="/approval" element={<div>Approval Console for Admin</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Approval Console for Admin')).toBeInTheDocument()
  })

  it('redirects unauthorized user to /dashboard (e.g. drafter accessing approval)', () => {
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'user_drafter',
        email: 'drafter@example.com',
        displayName: 'Drafter User',
        role: 'drafter',
        createdAt: '2026-09-06T00:00:00Z',
      },
      loading: false,
    } as any)

    render(
      <MemoryRouter initialEntries={['/approval']}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard Fallback</div>} />
          <Route element={<RoleRoute allowedRoles={['approver', 'reviewer']} />}>
            <Route path="/approval" element={<div>Approval Console</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Dashboard Fallback')).toBeInTheDocument()
    expect(screen.queryByText('Approval Console')).not.toBeInTheDocument()
  })

  it('handles capitalized role variants seamlessly from Firestore database truth', () => {
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'user_cap_app',
        email: 'approver@example.com',
        displayName: 'Approver User',
        role: 'Approver' as any,
        createdAt: '2026-09-06T00:00:00Z',
      },
      loading: false,
    } as any)

    render(
      <MemoryRouter initialEntries={['/approval']}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard Fallback</div>} />
          <Route element={<RoleRoute allowedRoles={['approver']} />}>
            <Route path="/approval" element={<div>Capitalized Approver Access</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Capitalized Approver Access')).toBeInTheDocument()
  })
})
