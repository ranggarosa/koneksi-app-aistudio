import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthController } from './auth.controller'
import type { UserRole } from './auth.model'
import { FileText, ShieldCheck, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { isFirebaseConfigured } from '@/config/firebase'

export const LoginView: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, handleGoogleLogin, loading, error, clearError } = useAuthController()
  const [selectedRole, setSelectedRole] = useState<UserRole>('drafter')

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true })
    }
  }, [user, navigate, from])

  const onLogin = async () => {
    clearError()
    const result = await handleGoogleLogin(selectedRole)
    if (result) {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30 mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Koneksi</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Sistem Otomatisasi Surat HR</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        <div className="space-y-5">
          {/* Demo role selector if environment variables are not yet provided */}
          {!isFirebaseConfigured && (
            <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-amber-800 uppercase tracking-wider text-[11px]">
                  Pilih Role Pengguna (Demo Fallback)
                </span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-medium">
                  .env belum diisi
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['drafter', 'reviewer', 'approver'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg border capitalize transition-all ${
                      selectedRole === role
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            disabled={loading}
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl border border-slate-300 shadow-sm transition duration-150 disabled:opacity-50 hover:shadow"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{loading ? 'Menghubungkan Akun...' : 'Login dengan Google'}</span>
            {!loading && <ArrowRight className="w-4 h-4 text-slate-400" />}
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Autentikasi aman melalui Firebase Auth Google Sign-In</span>
          </div>
        </div>
      </div>
    </div>
  )
}
