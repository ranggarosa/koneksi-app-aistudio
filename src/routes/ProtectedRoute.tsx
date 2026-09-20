import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthController } from '@/features/auth/auth.controller'
import { Loader2 } from 'lucide-react'

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuthController()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Memverifikasi sesi pengguna...</p>
      </div>
    )
  }

  if (!user) {
    // Redirect unauthenticated users to /login and preserve previous intended path
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
