import React, { useState, useEffect, useMemo } from 'react'
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  FilePlus,
  CheckCircle2,
  XCircle,
  Ban,
  UserCheck,
  Activity,
  Clock,
  ArrowRight,
  Lock,
} from 'lucide-react'
import { useAuthController } from '@/features/auth/auth.controller'
import { normalizeRole } from '@/features/auth/auth.model'
import { auditService } from './audit.service'
import type { AuditLog, AuditActionType } from './audit.model'

const ACTION_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  DOCUMENT_CREATED: {
    label: 'Surat Dibuat',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: FilePlus,
  },
  DOCUMENT_APPROVED: {
    label: 'Surat Disetujui',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  DOCUMENT_REJECTED: {
    label: 'Surat Ditolak',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: XCircle,
  },
  DOCUMENT_CANCELLED: {
    label: 'Surat Dibatalkan',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Ban,
  },
  USER_ROLE_CHANGED: {
    label: 'Peran User Diubah',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: UserCheck,
  },
  DOCUMENT_UPDATED: {
    label: 'Surat Diperbarui',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: Activity,
  },
}

export const AuditLogTable: React.FC<{ maxRows?: number; title?: string }> = ({
  maxRows = 100,
  title = 'Log Audit & Jejak Aktivitas Sistem',
}) => {
  const { user } = useAuthController()
  const isAdmin = normalizeRole(user?.role) === 'admin'

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<AuditActionType | 'ALL'>('ALL')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Real-time subscription to audit_logs collection
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = auditService.subscribeToLogs((updatedLogs) => {
      setLogs(updatedLogs)
      setLoading(false)
    }, maxRows)

    return () => {
      unsubscribe()
    }
  }, [isAdmin, maxRows])

  const handleManualRefresh = async () => {
    if (!isAdmin) return
    setIsRefreshing(true)
    try {
      const data = await auditService.getAllLogs(maxRows)
      setLogs(data)
    } catch (err) {
      console.warn('Gagal memuat ulang audit logs:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Filter logs in memory based on current controls
  const filteredLogs = useMemo(() => {
    return auditService.filterLogs(logs, {
      actionType: selectedAction,
      search: searchQuery,
    })
  }, [logs, selectedAction, searchQuery])

  // Strict Admin-only access guard
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-200">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Akses Terbatas: Khusus Administrator</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
          Hanya pengguna dengan peran <strong>Administrator</strong> yang memiliki hak akses untuk memantau
          jejak audit aktivitas sistem dan perubahan status dokumen secara menyeluruh.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">{title}</h2>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Feed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Catatan riwayat tidak dapat diubah (immutable record) untuk kepatuhan & transparansi organisasi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition disabled:opacity-50"
            title="Muat ulang log aktivitas"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Memuat...' : 'Segarkan'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor surat, nama user, alasan, atau kata kunci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition"
          />
        </div>

        {/* Action Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1 hidden sm:inline" />
          <button
            type="button"
            onClick={() => setSelectedAction('ALL')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              selectedAction === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({logs.length})
          </button>
          {(
            [
              'DOCUMENT_CREATED',
              'DOCUMENT_APPROVED',
              'DOCUMENT_REJECTED',
              'DOCUMENT_CANCELLED',
              'USER_ROLE_CHANGED',
            ] as AuditActionType[]
          ).map((action) => {
            const config = ACTION_CONFIG[action]
            const count = logs.filter((l) => l.actionType === action).length
            return (
              <button
                key={action}
                type="button"
                onClick={() => setSelectedAction(action)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                  selectedAction === action
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{config ? config.label : action}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedAction === action ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
          <span>Memuat catatan riwayat audit sistem...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Tidak ada log aktivitas yang cocok</p>
          <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter aksi</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Waktu & Tanggal</th>
                <th className="py-3 px-5">Tipe Aksi</th>
                <th className="py-3 px-5">Dilakukan Oleh</th>
                <th className="py-3 px-5">Objek Target</th>
                <th className="py-3 px-5">Detail / Perubahan Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const config = ACTION_CONFIG[log.actionType] || {
                  label: log.actionType,
                  badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                  icon: Activity,
                }
                const ActionIcon = config.icon

                // Format timestamp
                const dateObj = new Date(log.timestamp)
                const isValidDate = !isNaN(dateObj.getTime())
                const dateStr = isValidDate
                  ? dateObj.toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : log.timestamp
                const timeStr = isValidDate
                  ? dateObj.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    }) + ' WIB'
                  : ''

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-5 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{timeStr}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 ml-5">{dateStr}</div>
                    </td>

                    {/* Action Type Badge */}
                    <td className="py-3 px-5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${config.badgeClass}`}
                      >
                        <ActionIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{config.label}</span>
                      </span>
                    </td>

                    {/* Performed By */}
                    <td className="py-3 px-5">
                      <div className="font-semibold text-slate-800">{log.performedBy.name}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="capitalize px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-mono">
                          {log.performedBy.role || 'user'}
                        </span>
                        {log.performedBy.email && (
                          <span className="text-slate-400 truncate max-w-[140px]">{log.performedBy.email}</span>
                        )}
                      </div>
                    </td>

                    {/* Target Resource */}
                    <td className="py-3 px-5">
                      <div className="font-mono font-medium text-slate-900 text-xs">
                        {log.targetResource.resourceIdentifier || log.targetResource.resourceId}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                        Tipe: {log.targetResource.resourceType}
                      </div>
                    </td>

                    {/* Metadata / Details */}
                    <td className="py-3 px-5 text-slate-600">
                      {log.actionType === 'USER_ROLE_CHANGED' && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="px-2 py-0.5 bg-slate-100 rounded font-semibold text-slate-700 capitalize">
                            {String(log.metadata?.previousRole || 'drafter')}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold capitalize">
                            {String(log.metadata?.newRole || 'admin')}
                          </span>
                        </div>
                      )}

                      {log.actionType === 'DOCUMENT_APPROVED' && (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-500">{String(log.metadata?.previousState || 'In Review')}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-emerald-700">
                              {String(log.metadata?.newState || 'Approved')}
                            </span>
                          </div>
                          {Boolean(log.metadata?.notes) && (
                            <p className="text-[11px] text-slate-500 italic">
                              Catatan: &ldquo;{String(log.metadata?.notes)}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      {log.actionType === 'DOCUMENT_REJECTED' && (
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-rose-700">Ditolak</span>
                          {Boolean(log.metadata?.reason) && (
                            <p className="text-[11px] text-rose-600">
                              Alasan: <em>{String(log.metadata?.reason)}</em>
                            </p>
                          )}
                        </div>
                      )}

                      {log.actionType === 'DOCUMENT_CANCELLED' && (
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-amber-800">Dibatalkan & Nomor Di-void</span>
                          {Boolean(log.metadata?.reason) && (
                            <p className="text-[11px] text-amber-700">
                              Alasan: <em>{String(log.metadata?.reason)}</em>
                            </p>
                          )}
                        </div>
                      )}

                      {log.actionType === 'DOCUMENT_CREATED' && (
                        <div className="text-xs text-slate-600">
                          <span>Template: </span>
                          <strong className="text-slate-800">{String(log.metadata?.templateType || 'Surat')}</strong>
                          {Boolean(log.metadata?.newState) && (
                            <span className="text-slate-400 text-[11px] ml-1.5">
                              (Status awal: {String(log.metadata?.newState)})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer info bar */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>
          Menampilkan <strong className="text-slate-700">{filteredLogs.length}</strong> catatan aktivitas
        </span>
        <span className="text-[11px] text-slate-400 font-mono">Collection: audit_logs</span>
      </div>
    </div>
  )
}
