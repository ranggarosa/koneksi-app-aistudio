import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, FileText, Clock, CheckCircle2, Eye, Hash, XCircle, History, RefreshCw } from 'lucide-react'
import { useLetterDashboardController } from './letter.controller'
import { useAuthController } from '@/features/auth/auth.controller'
import { normalizeRole } from '@/features/auth/auth.model'
import { Badge } from '@/components/common/Badge'
import type { LetterStatus } from './letter.model'
import { AuditLogTable } from '@/features/audit/AuditLogTable'

export const LetterDashboardView: React.FC = () => {
  const navigate = useNavigate()
  const { user, canCreateLetter } = useAuthController()
  const isAdmin = normalizeRole(user?.role) === 'admin'
  const [activeTab, setActiveTab] = useState<'letters' | 'audit'>('letters')

  const {
    letters,
    metrics,
    loading,
    loadingMetrics,
    error,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    refresh,
  } = useLetterDashboardController()

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Surat</h1>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-semibold border border-slate-200">
              Total {metrics.total} Dokumen
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Selamat datang kembali, <span className="font-semibold text-slate-700">{user?.name || 'User'}</span>. Pantau alur pembuatan dan persetujuan surat Anda di sini.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refresh}
            title="Muat ulang data"
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-xs transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading || loadingMetrics ? 'animate-spin' : ''}`} />
          </button>

          {canCreateLetter && (
            <>
              <button
                type="button"
                onClick={() => navigate('/letters/standalone-number')}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl border border-slate-300 shadow-xs transition"
              >
                <Hash className="w-4 h-4 text-blue-600" />
                <span>Ambil Nomor Surat</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/letters/create')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Surat Baru</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Real-time Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Drafts */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Draft' ? 'All' : 'Draft')}
          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-sm hover:border-slate-400 flex items-center justify-between ${
            statusFilter === 'Draft' ? 'ring-2 ring-indigo-500 border-transparent bg-indigo-50/20' : 'border-slate-200'
          }`}
          title="Klik untuk filter Dokumen Draf"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Drafts</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalDrafts}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Draf surat tersimpan</p>
          </div>
          <div className="w-11 h-11 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Pending Approvals */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'In Review' ? 'All' : 'In Review')}
          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-sm hover:border-amber-400 flex items-center justify-between ${
            statusFilter === 'In Review' ? 'ring-2 ring-amber-500 border-transparent bg-amber-50/20' : 'border-slate-200'
          }`}
          title="Klik untuk filter Dokumen Sedang Ditinjau"
        >
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Approvals</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.pendingApprovals}</p>
            <p className="text-[11px] text-amber-600/80 mt-0.5">Menunggu persetujuan</p>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Rejected */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Rejected' ? 'All' : 'Rejected')}
          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-sm hover:border-rose-400 flex items-center justify-between ${
            statusFilter === 'Rejected' ? 'ring-2 ring-rose-500 border-transparent bg-rose-50/20' : 'border-slate-200'
          }`}
          title="Klik untuk filter Dokumen Ditolak"
        >
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Rejected</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.rejected}</p>
            <p className="text-[11px] text-rose-600/80 mt-0.5">Dokumen ditolak</p>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Completed */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Approved' ? 'All' : 'Approved')}
          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-sm hover:border-emerald-400 flex items-center justify-between ${
            statusFilter === 'Approved' ? 'ring-2 ring-emerald-500 border-transparent bg-emerald-50/20' : 'border-slate-200'
          }`}
          title="Klik untuk filter Dokumen Selesai / Disetujui"
        >
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.completed}</p>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">Dokumen selesai & disetujui</p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Admin View Selector (if Admin) */}
      {isAdmin && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('letters')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'letters'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Daftar Dokumen ({letters.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'audit'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-emerald-500" />
            <span>Audit Log Sistem</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">
              Admin
            </span>
          </button>
        </div>
      )}

      {/* Tab: System Audit Log */}
      {isAdmin && activeTab === 'audit' ? (
        <AuditLogTable />
      ) : (
        /* Letters History Table Card */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nomor surat, jenis, atau drafter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(['All', 'Draft', 'In Review', 'Approved', 'Rejected', 'Booked', 'Cancelled', 'Processing PDF', 'Error PDF'] as (LetterStatus | 'All')[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {status === 'All' ? 'Semua Status' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Memuat data riwayat surat...</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 text-sm">{error}</div>
          ) : letters.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Tidak ada surat ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter status</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Nomor Surat</th>
                    <th className="py-3.5 px-5">Jenis Surat</th>
                    <th className="py-3.5 px-5">Drafter</th>
                    <th className="py-3.5 px-5">Tanggal Pembuatan</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {letters.map((letter) => (
                    <tr key={letter.letterId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={letter.status === 'Cancelled' || letter.status === 'Canceled' ? 'text-slate-500 line-through' : ''}>
                            {letter.letterNumber}
                          </span>
                          {letter.isVoidedNumber && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium border border-slate-300">
                              Voided
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600">{letter.templateType}</td>
                      <td className="py-3.5 px-5 text-slate-600">{letter.drafterName}</td>
                      <td className="py-3.5 px-5 text-slate-500 text-xs">
                        {new Date(letter.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-5">
                        <Badge status={letter.status} />
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/letters/${letter.letterId}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
