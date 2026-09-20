import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Bell, Shield } from 'lucide-react'
import { useAuthController } from '@/features/auth/auth.controller'

export const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const { user, handleLogout } = useAuthController()

  const onLogout = async () => {
    await handleLogout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
          <Shield className="w-3.5 h-3.5" />
          <span className="capitalize">{user?.role || 'Guest'} Mode</span>
        </span>
        <span className="text-xs text-slate-400 hidden sm:inline">|</span>
        <span className="text-xs text-slate-500 hidden sm:inline">Sistem Manajemen Surat Menyurat HR</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          title="Notifikasi"
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
        >
          <Bell className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-slate-800">{user?.name || 'User'}</div>
            <div className="text-[11px] text-slate-400">{user?.email || 'user@koneksi.co.id'}</div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Keluar dari sistem"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200/80 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
