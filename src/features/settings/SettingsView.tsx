import React, { useState, useRef, useEffect } from 'react'
import { User, Shield, PenTool, CheckCircle2, AlertCircle, Upload, Eraser, Save, Sparkles, Lock, History } from 'lucide-react'
import { useSettingsController } from './settings.controller'
import { useAuthController } from '@/features/auth/auth.controller'
import type { UserRole } from '@/features/auth/auth.model'
import { normalizeRole } from '@/features/auth/auth.model'
import { useToast } from '@/components/common/Toast'
import { AuditLogTable } from '@/features/audit/AuditLogTable'

export const SettingsView: React.FC = () => {
  const { user } = useAuthController()
  const {
    users,
    loading,
    saving,
    error,
    successMessage,
    clearSuccess,
    updateUserRole,
    uploadSignature,
    uploadSignatureFile,
  } = useSettingsController()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const isAdmin = normalizeRole(user?.role) === 'admin'
  const isApprover = normalizeRole(user?.role) === 'approver' || isAdmin

  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'audit'>('profile')
  const [signaturePreview, setSignaturePreview] = useState<string | null>(user?.signatureUrl || null)
  const [sigMode, setSigMode] = useState<'upload' | 'draw'>('upload')
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  // Inisialisasi kanvas tanda tangan
  useEffect(() => {
    if (sigMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = '#1e1b4b' // Dark indigo ink
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
  }, [sigMode])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    setHasDrawn(true)

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleSaveCanvasSignature = async () => {
    if (!canvasRef.current || !user) return
    if (!hasDrawn) {
      toast.showToast({
        type: 'info',
        title: 'Kanvas Kosong',
        message: 'Silakan goreskan tanda tangan Anda pada kanvas terlebih dahulu.',
      })
      return
    }

    try {
      const dataUrl = canvasRef.current.toDataURL('image/png')
      setSignaturePreview(dataUrl)
      await uploadSignature(user.uid, dataUrl)
      toast.showToast({
        type: 'success',
        title: 'Tanda Tangan Disimpan',
        message: 'Spesimen tanda tangan dari kanvas berhasil disimpan ke profil Anda.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan tanda tangan dari kanvas'
      toast.showToast({
        type: 'error',
        title: 'Gagal Menyimpan',
        message: msg,
      })
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      const objectUrl = URL.createObjectURL(file)
      setSignaturePreview(objectUrl)
      const uploadedUrl = await uploadSignatureFile(user.uid, file)
      setSignaturePreview(uploadedUrl)
      toast.showToast({
        type: 'success',
        title: 'Tanda Tangan Diperbarui',
        message: 'Spesimen tanda tangan digital berhasil diunggah ke storage.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah berkas tanda tangan'
      toast.showToast({
        type: 'error',
        title: 'Gagal Mengunggah',
        message: msg,
      })
    }
  }

  const handleSimulateUpload = () => {
    if (!user) return
    const mockSig = 'https://dummyimage.com/300x120/4f46e5/ffffff&text=E-Signature+Hendra'
    setSignaturePreview(mockSig)
    uploadSignature(user.uid, mockSig)
    toast.showToast({
      type: 'info',
      title: 'Simulasi Diperbarui',
      message: 'Spesimen tanda tangan digital simulasi berhasil diterapkan.',
    })
  }

  const handleRoleChange = async (uid: string, role: UserRole, userName: string) => {
    if (!isAdmin) {
      toast.showToast({
        type: 'error',
        title: 'Akses Ditolak',
        message: 'Hanya Admin yang berwenang mengubah peran pengguna.',
      })
      return
    }

    try {
      await updateUserRole(uid, role)
      toast.showToast({
        type: 'success',
        title: 'Peran Diperbarui',
        message: `Peran ${userName} berhasil diubah menjadi ${role}.`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui peran'
      toast.showToast({
        type: 'error',
        title: 'Gagal',
        message: msg,
      })
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan Sistem</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Kelola profil pengguna, spesimen tanda tangan elektronik, dan manajemen peran.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={clearSuccess} className="text-emerald-800 font-bold">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profil Pribadi & Tanda Tangan</span>
        </button>

        {/* Tab 2: Admin Only per Wireframe */}
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Manajemen Akses & Role Pengguna</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">
              Admin
            </span>
          </button>
        ) : (
          <div
            title="Hanya akun dengan peran Admin yang dapat mengelola pengguna"
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-400 cursor-not-allowed opacity-60"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Manajemen Pengguna (Khusus Admin)</span>
          </div>
        )}

        {/* Tab 3: System Audit Log (Admin Only) */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition -mb-px ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Log Sistem</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">
              Live
            </span>
          </button>
        )}
      </div>

      {/* Tab 1: Profile & Signature */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Informasi Akun Pengguna
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase">Nama Lengkap</label>
                <p className="font-semibold text-slate-800 mt-0.5">{user?.name || 'Ahmad Drafter'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase">Email Perusahaan</label>
                <p className="text-slate-600 mt-0.5">{user?.email || 'ahmad@koneksi.co.id'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase">Peran Saat Ini</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 capitalize border border-indigo-200">
                    {user?.role || 'drafter'}
                  </span>
                  {isAdmin && (
                    <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                      Hak Istimewa Admin Penuh
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                Departemen: <strong className="text-slate-700">{user?.department || 'Human Resources (HR)'}</strong>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Spesimen Tanda Tangan Digital
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  E-Signature otomatis untuk pengesahan surat resmi
                </p>
              </div>
              <PenTool className="w-4 h-4 text-indigo-600" />
            </div>

            {/* Role Notice */}
            {isApprover ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Hak Akses Approver:</strong> Tanda tangan ini otomatis disuntikkan ke dokumen PDF saat Anda menyetujui surat.
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Role Anda adalah <strong>{user?.role || 'Drafter'}</strong>. E-Signature wajib dimiliki terutama oleh role Approver.
                </span>
              </div>
            )}

            {/* Mode Switcher: Unggah Berkas vs Goreskan Langsung */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSigMode('upload')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition ${
                  sigMode === 'upload' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unggah Berkas Gambar
              </button>
              <button
                type="button"
                onClick={() => setSigMode('draw')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  sigMode === 'draw' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Goreskan Tanda Tangan</span>
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
            />

            {/* Display Mode 1: File Upload & Current Preview */}
            {sigMode === 'upload' ? (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50/60">
                  {signaturePreview ? (
                    <div className="space-y-2">
                      <img
                        src={signaturePreview}
                        alt="Spesimen Tanda Tangan"
                        className="max-h-24 mx-auto rounded border border-slate-200 bg-white p-2 shadow-xs"
                      />
                      <p className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Spesimen Tanda Tangan Terdaftar
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-medium">Belum ada spesimen tanda tangan</p>
                      <p className="text-[11px] text-slate-400">Dukung format PNG, JPG, atau SVG (latar transparan disarankan)</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{saving ? 'Mengunggah...' : 'Pilih Berkas Gambar'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSimulateUpload}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition flex items-center justify-center gap-1.5"
                    title="Gunakan spesimen dummy untuk simulasi cepat"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Simulasi Dummy</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Display Mode 2: Interactive Signature Pad */
              <div className="space-y-3">
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Goreskan tanda tangan Anda dengan kursor / sentuhan:</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                    >
                      <Eraser className="w-3 h-3" />
                      <span>Bersihkan</span>
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={380}
                    height={130}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 bg-white cursor-crosshair touch-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving || !hasDrawn}
                    onClick={handleSaveCanvasSignature}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Menyimpan...' : 'Simpan Goresan Tanda Tangan'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: User Role Management (Restricted to Admin per PRD & Wireframe) */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Daftar Pengguna & Hak Akses</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase">
                  Khusus Admin
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Atur wewenang peran pengguna sistem (Drafter, Reviewer, Approver, Admin)
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Total: <strong className="text-slate-800">{users.length} Pengguna Terdaftar</strong>
            </div>
          </div>

          {!isAdmin ? (
            <div className="p-12 text-center space-y-2">
              <Lock className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Akses Terbatas</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Hanya akun dengan peran Admin yang memiliki wewenang untuk mengubah peran pengguna lain.
              </p>
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Memuat daftar pengguna...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Nama Pengguna</th>
                    <th className="py-3 px-5">Email</th>
                    <th className="py-3 px-5">Departemen</th>
                    <th className="py-3 px-5">Role Akses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((item) => (
                    <tr key={item.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.uid === user?.uid && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 border border-emerald-200 rounded font-medium">
                              Anda
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 text-xs">{item.email}</td>
                      <td className="py-3.5 px-5 text-slate-600">{item.department}</td>
                      <td className="py-3.5 px-5">
                        <select
                          value={normalizeRole(item.role)}
                          disabled={saving}
                          onChange={(e) => handleRoleChange(item.uid, e.target.value as UserRole, item.name)}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 capitalize"
                        >
                          <option value="drafter">Drafter</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="approver">Approver</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: System Audit Log */}
      {activeTab === 'audit' && isAdmin && (
        <div className="space-y-4">
          <AuditLogTable />
        </div>
      )}
    </div>
  )
}

