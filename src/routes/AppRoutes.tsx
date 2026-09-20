import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'
import { LoginView } from '@/features/auth/LoginView'
import { LetterDashboardView } from '@/features/letters/LetterDashboardView'
import { CreateLetterView } from '@/features/letters/CreateLetterView'
import { LetterDetailView } from '@/features/letters/LetterDetailView'
import { StandaloneNumberGeneratorView } from '@/features/letters/StandaloneNumberGeneratorView'
import { SettingsView } from '@/features/settings/SettingsView'

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginView />} />
      </Route>

      {/* Protected Routes: Must be authenticated to access */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<LetterDashboardView />} />

          {/* Drafter-Only Protected Routes */}
          <Route element={<RoleRoute allowedRoles={['drafter']} redirectTo="/dashboard" />}>
            <Route path="/create" element={<CreateLetterView />} />
            <Route path="/letters/create" element={<CreateLetterView />} />
            <Route path="/letters/standalone-number" element={<StandaloneNumberGeneratorView />} />
            <Route path="/letters/book-number" element={<StandaloneNumberGeneratorView />} />
          </Route>

          <Route path="/letters/:id" element={<LetterDetailView />} />
          <Route path="/letter/:id" element={<LetterDetailView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
