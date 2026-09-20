import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthController } from '@/features/auth/auth.controller'
import type { UserRole } from '@/features/auth/auth.model'
import { normalizeRole } from '@/features/auth/auth.model'

interface RoleRouteProps {
  allowedRoles: UserRole[]
  redirectTo?: string
}

export const RoleRoute: React.FC<RoleRouteProps> = ({
  allowedRoles,
  redirectTo = '/dashboard',
}) => {
  const { user, loading } = useAuthController()

  if (loading) {
    return null // Handled by outer ProtectedRoute
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Admin has overarching access, otherwise check if user's role matches allowedRoles
  const userRole = normalizeRole(user.role)
  const allowed = allowedRoles.map((r) => normalizeRole(r))
  const hasAccess = userRole === 'admin' || allowed.includes(userRole)

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}

