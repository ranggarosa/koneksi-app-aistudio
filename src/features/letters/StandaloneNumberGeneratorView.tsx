import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Hash,
  Calendar,
  FileText,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  PlusCircle,
  LayoutDashboard,
  CheckCircle2,
} from 'lucide-react'
import { useStandaloneNumberController } from './standalone-number.controller'
import { LETTER_TEMPLATES } from './letter.model'

export const StandaloneNumberGeneratorView: React.FC = () => {
  const navigate = useNavigate()
  const {
    templateType,
    setTemplateType,
    issuedDate,
    setIssuedDate,
    purpose,
    setPurpose,
    loading,
    error,
    success,
    bookedResult,
    copied,
    handleSubmit,
    copyToClipboard,
    resetForm,
  } = useStandaloneNumberController()

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb / Back Link */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Ambil Nomor Surat (Standalone)
            </h1>
            <p className="text-sm text-slate-500">
              Booking nomor surat resmi secara langsung tanpa melalui penyusunan draf dokumen lengkap.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification & Booking Card */}
      {success && bookedResult && (
        <div className="bg-white border-2 border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-md shadow-emerald-500/5 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider mb-1">
                Nomor Berhasil Di-Booking
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Nomor Surat Resmi Telah Diterbitkan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nomor ini telah dicatat secara permanen di sistem dengan status <strong className="text-blue-600">Booked</strong> untuk mencegah duplikasi.
              </p>
            </div>
          </div>

          {/* Big Number Highlight Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800 shadow-inner">
            <div>
              <p className="text-xs uppercase font-bold tracking-widest text-slate-400">
                Nomor Surat Resmi
              </p>
              <p className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white mt-1 select-all">
                {bookedResult.letterNumber}
              </p>
            </div>

            <button
              type="button"
              onClick={copyToClipboard}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition ${
                copied
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Nomor</span>
                </>
              )}
            </button>
          </div>

          {/* Details Metadata */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Kategori Surat</span>
              <span className="text-slate-800 font-semibold text-sm mt-0.5 block">
                {bookedResult.templateType} ({LETTER_TEMPLATES[bookedResult.templateType]?.code || 'LTR'})
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Tanggal Penerbitan</span>
              <span className="text-slate-800 font-semibold text-sm mt-0.5 block">
                {new Date(bookedResult.issuedDate).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Pengguna / Pemohon</span>
              <span className="text-slate-800 font-semibold text-sm mt-0.5 block">
                {bookedResult.bookedBy}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Waktu Pencatatan</span>
              <span className="text-slate-800 font-semibold text-sm mt-0.5 block">
                {new Date(bookedResult.createdAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                WIB
              </span>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-slate-200">
              <span className="text-slate-400 font-medium block">Keperluan / Deskripsi</span>
              <p className="text-slate-800 font-normal text-sm mt-1 whitespace-pre-line">
                {bookedResult.purpose}
              </p>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ambil Nomor Lain</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm transition"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Ke Dashboard</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Generator Form Card (shown when not showing success, or ready to book) */}
      {!success && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6"
        >
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Kategori Surat */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Jenis / Kategori Surat <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition appearance-none cursor-pointer"
                >
                  {Object.values(LETTER_TEMPLATES).map((tmpl) => (
                    <option key={tmpl.type} value={tmpl.type}>
                      {tmpl.label} (Kode: {tmpl.code})
                    </option>
                  ))}
                </select>
                <FileText className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400">
                Kode surat otomatis di-set berdasarkan kategori yang dipilih.
              </p>
            </div>

            {/* Tanggal Penerbitan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Tanggal Penerbitan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  required
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400">
                Bulan Romawi dan tahun pada nomor surat dihitung dari tanggal ini.
              </p>
            </div>
          </div>

          {/* Keperluan / Deskripsi Surat */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Deskripsi / Keperluan Surat <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Contoh: Pengambilan nomor untuk Surat Tugas Audit Lapangan Cabang Surabaya eksternal..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition leading-relaxed resize-none"
              required
            />
            <p className="text-[11px] text-slate-400">
              Wajib diisi agar alasan pem-booking-an nomor surat dapat dipertanggungjawabkan dalam audit.
            </p>
          </div>

          {/* Info Callout */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-3 text-xs text-blue-800 leading-relaxed">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Informasi Penomoran Otomatis:</strong> Nomor surat dihasilkan melalui transaksi Firestore atomik dengan format{' '}
              <code className="px-1.5 py-0.5 rounded bg-blue-100/80 font-mono text-[11px] text-blue-900">
                [NOMOR_URUT].[KODE_SURAT]/[BULAN_ROMAWI]/[TAHUN]
              </code>
              . Nomor yang telah di-generate akan berstatus <strong>Booked</strong> dan tidak akan pernah digunakan kembali.
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memproses Transaksi...</span>
                </>
              ) : (
                <>
                  <Hash className="w-4 h-4" />
                  <span>Generate Nomor</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
