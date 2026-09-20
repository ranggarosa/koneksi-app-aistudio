import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/common/Sidebar'
import { Navbar } from '@/components/common/Navbar'
import { ToastProvider } from '@/components/common/Toast'

export const AppLayout: React.FC = () => {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
