import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FilePlus2, Settings, FileText, UserCircle, Hash } from 'lucide-react'
import { useAuthController } from '@/features/auth/auth.controller'

export const Sidebar: React.FC = () => {
  const { user, canCreateLetter } = useAuthController()

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: 'Buat Surat',
      path: '/letters/create',
      icon: FilePlus2,
      show: canCreateLetter,
    },
    {
      label: 'Ambil Nomor',
      path: '/letters/standalone-number',
      icon: Hash,
      show: canCreateLetter,
    },
    {
      label: 'Pengaturan',
      path: '/settings',
      icon: Settings,
      show: true,
    },
  ]

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-slate-900 tracking-tight text-lg">Koneksi</span>
          <span className="block text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Letter Management</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Menu Utama
        </div>
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
      </nav>

      {/* User Info Preview in Sidebar Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full bg-slate-200" />
          ) : (
            <UserCircle className="w-9 h-9 text-slate-400" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || 'Guest'}</p>
            <p className="text-[11px] font-medium text-indigo-600 capitalize truncate">{user?.role || 'No Role'}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
