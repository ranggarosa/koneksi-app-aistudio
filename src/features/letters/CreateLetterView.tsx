import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, ArrowLeft, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useCreateLetterController } from './letter.controller'
import { useAuthController } from '@/features/auth/auth.controller'

export const CreateLetterView: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthController()
  const {
    templateType,
    jenisSurat,
    reviewerId,
    approverId,
    formData,
    candidates,
    loadingCandidates,
    loading,
    error,
    feedback,
    setJenisSurat,
    setReviewerId,
    setApproverId,
    handleFieldChange,
    handleTemplateChange,
    submitLetterDraft,
  } = useCreateLetterController()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const created = await submitLetterDraft(user.uid, user.name)
    if (created) {
      setTimeout(() => {
        navigate('/dashboard')
      }, 1200)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        {/* Header Title */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FilePlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Buat Draf Surat Baru</h1>
            <p className="text-xs text-slate-500">
              Formulir dinamis khusus Drafter untuk inisiasi dokumen resmi
            </p>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {feedback && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{feedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Template & Department Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Pilih Kategori / Template Surat <span className="text-rose-500">*</span>
              </label>
              <select
                value={templateType}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
              >
                <option value="Surat Tugas">Surat Tugas</option>
                <option value="SP 1">Surat Peringatan 1 (SP 1)</option>
                <option value="SP 2">Surat Peringatan 2 (SP 2)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Jenis Surat <span className="text-rose-500">*</span>
              </label>
              <select
                value={jenisSurat}
                onChange={(e) => setJenisSurat(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
              >
                <option value="Surat Internal">Surat Internal</option>
                <option value="Surat Eksternal">Surat Eksternal</option>
                <option value="Surat Rahasia / Konfidensial">Surat Rahasia / Konfidensial</option>
              </select>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* 2. Common Recipient Section */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Data Karyawan / Penerima
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dimas Aditya"
                  value={formData.recipientName}
                  onChange={(e) => handleFieldChange('recipientName', e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nomor Induk Karyawan (NIK) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1993081001"
                  value={formData.recipientNik}
                  onChange={(e) => handleFieldChange('recipientNik', e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Jabatan Karyawan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Staff Operasional"
                  value={formData.position}
                  onChange={(e) => handleFieldChange('position', e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* 3. Dynamic Fields Based on Template */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Variabel Khusus: {templateType}
            </h2>

            {/* Template: Surat Tugas */}
            {templateType === 'Surat Tugas' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Kota / Lokasi Tujuan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Surabaya, Jawa Timur"
                      value={formData.destination}
                      onChange={(e) => handleFieldChange('destination', e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Tanggal Mulai <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => handleFieldChange('startDate', e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Tanggal Berakhir <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => handleFieldChange('endDate', e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Keperluan / Agenda Penugasan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Contoh: Melakukan audit sistem dan inventarisasi aset cabang regional..."
                    value={formData.purpose}
                    onChange={(e) => handleFieldChange('purpose', e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>
            )}

            {/* Template: SP 1 & SP 2 */}
            {(templateType === 'SP 1' || templateType === 'SP 2') && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Tanggal Kejadian / Pelanggaran <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.violationDate}
                      onChange={(e) => handleFieldChange('violationDate', e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Tanggal Mulai Berlaku Sanksi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.effectiveDate}
                      onChange={(e) => handleFieldChange('effectiveDate', e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Alasan / Uraian Pelanggaran <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder={`Tuliskan rincian kronologi dan pasal pelanggaran tata tertib perusahaan untuk ${templateType}...`}
                    value={formData.violationReason}
                    onChange={(e) => handleFieldChange('violationReason', e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-200" />

          {/* 4. Approval Matrix Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pengaturan Alur Persetujuan (Approval Flow)
              </h2>
              {loadingCandidates && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Memuat daftar user...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. Petugas Reviewer (Opsional)
                </label>
                <select
                  value={reviewerId}
                  onChange={(e) => setReviewerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="">-- Tanpa Reviewer (Langsung Approver) --</option>
                  {candidates.reviewers.map((rev) => (
                    <option key={rev.uid} value={rev.uid}>
                      {rev.name} ({rev.department || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  2. Petugas Approver Final <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={approverId}
                  onChange={(e) => setApproverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="" disabled>-- Pilih Approver Final --</option>
                  {candidates.approvers.map((appr) => (
                    <option key={appr.uid} value={appr.uid}>
                      {appr.name} ({appr.department || 'Authorized'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              disabled={loading}
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Draf...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Draft</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
