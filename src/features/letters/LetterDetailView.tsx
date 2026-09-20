import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  X,
  FileText,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Download,
  User,
  ShieldCheck,
  Hash,
  RotateCw,
  Ban,
} from 'lucide-react'
import { useLetterDetailController } from './letter-detail.controller'
import { useAuthController } from '@/features/auth/auth.controller'
import { Badge } from '@/components/common/Badge'

export const LetterDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthController()
  const {
    letter,
    loading,
    actionLoading,
    error,
    feedbackMsg,
    clearFeedback,
    handleAction,
    handleCancelDocument,
    handleRejectDocument,
    handleRetryPdf,
  } = useLetterDetailController(id)

  const [notes, setNotes] = useState('')
  const [previewMode, setPreviewMode] = useState<'paper' | 'pdf'>('paper')
  const [modalType, setModalType] = useState<'cancel' | 'reject' | null>(null)
  const [modalReason, setModalReason] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 text-sm font-medium">Memuat pratinjau dan riwayat surat...</p>
      </div>
    )
  }

  if (!letter) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Dokumen Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">
          Surat dengan ID yang Anda tuju tidak tersedia atau telah dihapus.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Dashboard</span>
        </button>
      </div>
    )
  }

  // Cari langkah pending pertama dalam alur persetujuan
  const pendingStepIndex = letter.approvalFlow.findIndex((step) => step.status === 'pending')
  const pendingStep = pendingStepIndex !== -1 ? letter.approvalFlow[pendingStepIndex] : null

  // Pastikan langkah sebelum giliran saat ini sudah approved
  const arePreviousStepsApproved =
    pendingStepIndex === 0 ||
    (pendingStepIndex > 0 &&
      letter.approvalFlow.slice(0, pendingStepIndex).every((step) => step.status === 'approved'))

  // Giliran user saat ini jika status In Review, giliran pertama yang pending, dan user cocok (atau admin)
  const isMyTurn = Boolean(
    user &&
      pendingStep &&
      arePreviousStepsApproved &&
      (letter.status === 'In Review' || letter.status === 'Draft') &&
      (user.uid === pendingStep.userId ||
        user.role === 'admin' ||
        user.role === pendingStep.role)
  )

  // Cek otorisasi pembatalan & penolakan
  const isDrafter = Boolean(user && letter && user.uid === letter.drafterId)
  const isAdmin = Boolean(user && user.role === 'admin')
  const isApproved = letter.status === 'Approved'
  const isCancelled = letter.status === 'Cancelled' || letter.status === 'Canceled'
  const isRejected = letter.status === 'Rejected'

  // Syarat dapat membatalkan:
  // 1. Dokumen belum dibatalkan dan belum ditolak
  // 2. Jika status Approved: HANYA Admin yang berhak membatalkan (Void override)
  // 3. Jika status belum Approved: Drafter atau Admin berhak membatalkan
  const canCancel = Boolean(
    user &&
      letter &&
      !isCancelled &&
      !isRejected &&
      ((!isApproved && (isDrafter || isAdmin)) || (isApproved && isAdmin))
  )

  const onApprove = async () => {
    if (!user || !pendingStep) return
    const targetUserId = user.role === 'admin' ? pendingStep.userId : user.uid
    const success = await handleAction(targetUserId, 'approve', notes)
    if (success) {
      setNotes('')
    }
  }

  const onReject = async () => {
    if (!user || !pendingStep) return
    // Buka modal konfirmasi dengan validasi alasan wajib
    setModalType('reject')
    setModalReason(notes)
    setModalError(null)
  }

  const handleConfirmModalAction = async () => {
    if (!modalReason.trim()) {
      setModalError(
        modalType === 'cancel'
          ? 'Alasan pembatalan surat wajib diisi.'
          : 'Alasan penolakan dokumen wajib diisi.'
      )
      return
    }

    if (!user || !letter) return
    setModalError(null)

    if (modalType === 'cancel') {
      const userName = user.name || user.email || 'User'
      if (handleCancelDocument) {
        const success = await handleCancelDocument(
          user.uid,
          userName,
          user.role,
          modalReason.trim()
        )
        if (success) {
          setModalType(null)
          setModalReason('')
        }
      }
    } else if (modalType === 'reject') {
      const userName = user.name || user.email || 'Reviewer/Approver'
      if (handleRejectDocument) {
        const success = await handleRejectDocument(
          user.uid,
          userName,
          user.role,
          modalReason.trim()
        )
        if (success) {
          setModalType(null)
          setModalReason('')
          setNotes('')
        }
      } else {
        const targetUserId = user.role === 'admin' && pendingStep ? pendingStep.userId : user.uid
        const success = await handleAction(targetUserId, 'reject', modalReason.trim())
        if (success) {
          setModalType(null)
          setModalReason('')
          setNotes('')
        }
      }
    }
  }

  const isStandalone =
    letter.status === 'Booked' ||
    letter.contentData?.isStandaloneBooking === 'true'

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Riwayat Surat</span>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge status={letter.status} />

          {/* Action Button: Cancel Document */}
          {canCancel && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => {
                setModalType('cancel')
                setModalReason('')
                setModalError(null)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold border border-slate-300 hover:border-rose-300 transition shadow-2xs"
            >
              <Ban className="w-3.5 h-3.5 text-rose-500" />
              <span>Cancel Document</span>
            </button>
          )}

          {letter.finalPdfUrl && (
            <a
              href={letter.finalPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PDF</span>
            </a>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {feedbackMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={clearFeedback}
            className="text-emerald-700 hover:text-emerald-900 font-bold p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3 shadow-xs">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Read-Only Document Paper Preview OR Embedded PDF */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Tab Switcher for Final PDF Preview when available */}
          {letter.finalPdfUrl && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreviewMode('paper')}
                className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  previewMode === 'paper'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Draf Dokumen Teks</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('pdf')}
                className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  previewMode === 'pdf'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pratinjau Berkas PDF Final</span>
              </button>
            </div>
          )}

          {/* Render PDF Viewer when PDF tab is active */}
          {letter.finalPdfUrl && previewMode === 'pdf' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
                <span className="font-medium">Dokumen resmi telah di-generate oleh Google Workspace API</span>
                <a
                  href={letter.finalPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Buka di Tab Baru</span>
                </a>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                <iframe
                  src={letter.finalPdfUrl}
                  title={`PDF ${letter.letterNumber}`}
                  className="w-full h-[620px]"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Watermark / Banner Status Dokumen (Cancelled / Rejected) */}
              {isCancelled && (
                <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 tracking-wider uppercase font-mono">
                    <Ban className="w-4 h-4 text-slate-500" />
                    <span>[ DOKUMEN DIBATALKAN / VOIDED ]</span>
                  </div>
                  {letter.cancellationReason && (
                    <p className="text-xs text-slate-600 italic">
                      Alasan: "{letter.cancellationReason}"
                    </p>
                  )}
                  {letter.isVoidedNumber && (
                    <p className="text-[10px] text-slate-500 font-mono">
                      Nomor {letter.letterNumber} ditandai Voided untuk jejak audit.
                    </p>
                  )}
                </div>
              )}

              {isRejected && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-700 tracking-wider uppercase font-mono">
                    <AlertOctagon className="w-4 h-4 text-rose-500" />
                    <span>[ DOKUMEN DITOLAK / REJECTED ]</span>
                  </div>
                  {(letter.rejectionReason || letter.approvalFlow.find((s) => s.status === 'rejected')?.notes) && (
                    <p className="text-xs text-rose-800 italic">
                      Catatan Evaluasi: "{letter.rejectionReason || letter.approvalFlow.find((s) => s.status === 'rejected')?.notes}"
                    </p>
                  )}
                </div>
              )}

              {/* Header Surat */}
              <div className="border-b border-slate-200 pb-5 text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-wide">
                  {letter.templateType}
                </h2>
                <p className="text-sm font-mono font-bold text-indigo-600">
                  Nomor: {letter.letterNumber}
                </p>
                {letter.contentData.jenisSurat && (
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {String(letter.contentData.jenisSurat)}
                  </span>
                )}
              </div>

          {/* Standalone Booking Display */}
          {isStandalone ? (
            <div className="space-y-4 bg-slate-50/80 p-6 rounded-xl border border-slate-200 text-sm text-slate-700">
              <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs uppercase tracking-wider">
                <Hash className="w-4 h-4" />
                <span>Nomor Surat Standalone (Eksternal)</span>
              </div>
              <p className="text-slate-600">
                Nomor surat ini di-booking langsung tanpa dokumen draf internal untuk keperluan eksternal / offline.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500">Keperluan</span>
                <span className="col-span-2 font-medium text-slate-900">
                  : {String(letter.contentData.purpose || '-')}
                </span>

                <span className="text-slate-500">Tanggal Terbit</span>
                <span className="col-span-2 font-medium text-slate-900">
                  : {String(letter.contentData.issuedDate || new Date(letter.createdAt).toLocaleDateString('id-ID'))}
                </span>

                <span className="text-slate-500">Pemohon</span>
                <span className="col-span-2 font-medium text-slate-900">
                  : {letter.drafterName}
                </span>
              </div>
            </div>
          ) : (
            /* Standard Letter Body */
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-6 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-800">
                Yang bertanda tangan di bawah ini menerangkan bahwa:
              </p>

              <div className="grid grid-cols-3 gap-2.5 pl-2">
                <span className="text-slate-500">Nama Lengkap</span>
                <span className="col-span-2 font-medium text-slate-900">
                  : {String(letter.contentData.recipientName || '-')}
                </span>

                <span className="text-slate-500">NIK Karyawan</span>
                <span className="col-span-2 font-medium text-slate-900">
                  : {String(letter.contentData.recipientNik || '-')}
                </span>

                {letter.contentData.position && (
                  <>
                    <span className="text-slate-500">Jabatan</span>
                    <span className="col-span-2 font-medium text-slate-900">
                      : {String(letter.contentData.position)}
                    </span>
                  </>
                )}

                {letter.contentData.destination && (
                  <>
                    <span className="text-slate-500">Kota / Tujuan</span>
                    <span className="col-span-2 font-medium text-slate-900">
                      : {String(letter.contentData.destination)}
                    </span>
                  </>
                )}

                {letter.contentData.purpose && (
                  <>
                    <span className="text-slate-500">Keperluan / Agenda</span>
                    <span className="col-span-2 font-medium text-slate-900">
                      : {String(letter.contentData.purpose)}
                    </span>
                  </>
                )}

                {letter.contentData.startDate && (
                  <>
                    <span className="text-slate-500">Masa Berlaku</span>
                    <span className="col-span-2 font-medium text-slate-900">
                      : {String(letter.contentData.startDate)} s.d. {String(letter.contentData.endDate || '-')}
                    </span>
                  </>
                )}

                {letter.contentData.violationReason && (
                  <>
                    <span className="text-slate-500">Uraian Pelanggaran</span>
                    <span className="col-span-2 font-medium text-slate-900">
                      : {String(letter.contentData.violationReason)}
                    </span>
                  </>
                )}

                {letter.contentData.violationDate && (
                  <>
                    <span className="text-slate-500">Tgl Pelanggaran</span>
                    <span className="col-span-2 font-medium text-slate-900">
                      : {String(letter.contentData.violationDate)}
                    </span>
                  </>
                )}

                {letter.contentData.effectiveDate && (
                  <>
                    <span className="text-slate-500">Tgl Berlaku Sanksi</span>
                    <span className="col-span-2 font-medium text-slate-900">
                      : {String(letter.contentData.effectiveDate)}
                    </span>
                  </>
                )}
              </div>

              <p className="pt-4 text-xs text-slate-600 italic">
                Demikian surat keterangan resmi ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya dengan penuh tanggung jawab.
              </p>

              {/* Bottom Paper Signature Footer */}
              <div className="pt-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-xs text-slate-500 border-t border-slate-200 mt-6">
                <div>
                  <p>
                    Drafter: <strong className="text-slate-800">{letter.drafterName}</strong>
                  </p>
                  <p>
                    Tanggal Diajukan:{' '}
                    {new Date(letter.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {letter.status === 'Approved' ? (
                  <div className="text-left sm:text-right">
                    <div className="inline-flex items-center gap-1.5 border border-emerald-500 bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-lg tracking-wider uppercase text-[10px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Digital Signature</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">Persetujuan Lengkap & Sah</p>
                  </div>
                ) : letter.status === 'Processing PDF' ? (
                  <div className="text-left sm:text-right">
                    <div className="inline-flex items-center gap-1.5 border border-indigo-300 bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-lg tracking-wider uppercase text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                      <span>Processing PDF Engine</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">Google Docs API Generating...</p>
                  </div>
                ) : letter.status === 'Error PDF' ? (
                  <div className="text-left sm:text-right">
                    <div className="inline-flex items-center gap-1.5 border border-rose-300 bg-rose-50 text-rose-700 font-bold px-3 py-1 rounded-lg tracking-wider uppercase text-[10px]">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                      <span>Gagal Render PDF</span>
                    </div>
                    <p className="mt-1 text-[11px] text-rose-500">Perlu diproses ulang</p>
                  </div>
                ) : letter.status === 'Rejected' ? (
                  <div className="text-left sm:text-right">
                    <div className="inline-flex items-center gap-1.5 border border-rose-300 bg-rose-50 text-rose-700 font-bold px-3 py-1 rounded-lg tracking-wider uppercase text-[10px]">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                      <span>Dokumen Ditolak</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
          </>
        )}
        </div>

        {/* Right Column: Timeline & Decision Action Panel */}
        <div className="space-y-6">
          {/* Approval Timeline Component */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Jejak Alur Persetujuan</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {letter.approvalFlow.length} Tahap
              </span>
            </div>

            <div className="space-y-4">
              {/* Step 0: Drafter */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">{letter.drafterName}</p>
                  <p className="text-[11px] text-slate-500">Drafter • Dokumen Dibuat</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(letter.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Reviewer / Approver Steps */}
              {letter.approvalFlow.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 relative">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                      step.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : step.status === 'rejected'
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}
                  >
                    {step.status === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : step.status === 'rejected' ? (
                      <AlertOctagon className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{step.userName}</p>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          step.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : step.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 capitalize">
                      {step.role === 'reviewer' ? 'Reviewer (Pemeriksa)' : 'Approver Final'}
                    </p>
                    {step.signedAt && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(step.signedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                    {step.notes && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-1.5 italic">
                        "{step.notes}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Decision Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Panel Keputusan Otorisasi
            </h3>

            {letter.status === 'Cancelled' || letter.status === 'Canceled' ? (
              <div className="p-4 bg-slate-100 rounded-xl border border-slate-300 text-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Ban className="w-4 h-4 text-slate-600" />
                  <span>Dokumen Dibatalkan (Cancelled)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Surat ini telah dibatalkan oleh{' '}
                  <strong>{letter.cancelledBy || 'Drafter'}</strong>
                  {letter.cancelledAt && (
                    <span> pada {new Date(letter.cancelledAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</span>
                  )}.
                </p>
                {letter.cancellationReason && (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700">
                    <span className="font-semibold text-slate-900 block mb-0.5">Alasan Pembatalan:</span>
                    <p className="italic">"{letter.cancellationReason}"</p>
                  </div>
                )}
                {letter.isVoidedNumber && (
                  <div className="text-[11px] font-mono text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded border border-slate-300">
                    Status Nomor: <strong>{letter.numberStatus || 'Voided/Cancelled'}</strong> (Tercatat dalam Audit Log)
                  </div>
                )}
              </div>
            ) : letter.status === 'Approved' ? (
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-medium space-y-1">
                  <p className="font-bold">Otorisasi Selesai</p>
                  <p className="text-emerald-700">
                    Seluruh tahapan persetujuan telah dipenuhi. Dokumen ini sah secara digital.
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => {
                      setModalType('cancel')
                      setModalReason('')
                      setModalError(null)
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold rounded-xl border border-slate-300 hover:border-rose-300 transition"
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                    <span>Void / Cancel Document (Admin Override)</span>
                  </button>
                )}
              </div>
            ) : letter.status === 'Processing PDF' ? (
              <div className="p-5 bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-50 rounded-2xl border border-indigo-200 text-center space-y-3 shadow-xs animate-in fade-in duration-300">
                <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto text-indigo-600" />
                <div>
                  <p className="font-bold text-slate-900 text-xs">Dokumen Sedang Diproses Server</p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Persetujuan telah lengkap. Google Workspace PDF Engine di Cloud Functions sedang menyalin master template Google Docs, menginjeksi data dan tanda tangan, lalu mengekspor PDF resmi...
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-white text-indigo-700 border border-indigo-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                  <span>Menunggu proses render asinkron</span>
                </div>
              </div>
            ) : letter.status === 'Error PDF' ? (
              <div className="p-5 bg-rose-50/90 rounded-2xl border border-rose-200 space-y-3 animate-in fade-in duration-300">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-rose-900 text-xs">Gagal Merender PDF di Server</p>
                    <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                      {letter.pdfError || 'Terjadi gangguan koneksi atau kegagalan pemrosesan Google Workspace API di server.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleRetryPdf}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {actionLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RotateCw className="w-3.5 h-3.5" />
                  )}
                  <span>Coba Lagi Render PDF</span>
                </button>
              </div>
            ) : letter.status === 'Rejected' ? (
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>Dokumen Ditolak (Rejected)</span>
                </div>
                <p className="text-rose-700 leading-relaxed">
                  Alur otorisasi dihentikan oleh{' '}
                  <strong>{letter.rejectedBy || 'Reviewer/Approver'}</strong>
                  {letter.rejectedAt && (
                    <span> pada {new Date(letter.rejectedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</span>
                  )}.
                </p>
                {(letter.rejectionReason || letter.approvalFlow.find((s) => s.status === 'rejected')?.notes) && (
                  <div className="bg-white p-2.5 rounded-lg border border-rose-200 text-rose-900">
                    <span className="font-semibold text-rose-950 block mb-0.5">Catatan Evaluasi / Alasan Penolakan:</span>
                    <p className="italic">"{letter.rejectionReason || letter.approvalFlow.find((s) => s.status === 'rejected')?.notes}"</p>
                  </div>
                )}
              </div>
            ) : letter.status === 'Booked' ? (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-blue-800 text-xs font-medium space-y-1">
                <p className="font-bold">Nomor Surat Ter-booking</p>
                <p className="text-blue-700">
                  Nomor surat ini dicatat mandiri dan tidak memerlukan proses review/approve.
                </p>
              </div>
            ) : isMyTurn ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                  Giliran Anda untuk memberikan keputusan otorisasi sebagai{' '}
                  <strong className="capitalize text-amber-950">{pendingStep?.role}</strong>.
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Catatan Revisi / Evaluasi (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan catatan arahan revisi atau evaluasi (disarankan saat menolak)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition resize-none placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={onReject}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={onApprove}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs text-center space-y-1">
                <Clock className="w-5 h-5 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700">Menunggu Peninjauan</p>
                <p className="text-[11px] text-slate-400">
                  Saat ini giliran{' '}
                  <strong className="text-slate-600">{pendingStep?.userName}</strong> (
                  {pendingStep?.role}).
                </p>
              </div>
            )}

            {/* Secondary Action: Cancel Document option inside decision panel */}
            {canCancel && !isMyTurn && letter.status !== 'Approved' && (
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    setModalType('cancel')
                    setModalReason('')
                    setModalError(null)
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold rounded-xl border border-slate-200 hover:border-rose-200 transition disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cancel Document</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Pembatalan & Penolakan Dokumen */}
      {modalType && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    modalType === 'cancel'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {modalType === 'cancel' ? (
                    <Ban className="w-5 h-5" />
                  ) : (
                    <AlertOctagon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 id="modal-title" className="text-base font-bold text-slate-900">
                    {modalType === 'cancel'
                      ? 'Konfirmasi Pembatalan Surat'
                      : 'Konfirmasi Penolakan Dokumen'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalType === 'cancel'
                      ? `Nomor Surat: ${letter.letterNumber}`
                      : 'Alur persetujuan dokumen ini akan dihentikan'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalType(null)
                  setModalError(null)
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit & Traceability Notice */}
            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                modalType === 'cancel'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {modalType === 'cancel' ? (
                <span>
                  <strong>Catatan Audit:</strong> Pembatalan surat akan menandai nomor surat{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">
                    {letter.letterNumber}
                  </code>{' '}
                  sebagai <strong>Voided/Cancelled</strong> untuk audit traceability. Nomor ini tidak
                  dihapus untuk mencegah celah penomoran (sequence gap) tanpa keterangan.
                </span>
              ) : (
                <span>
                  <strong>Perhatian:</strong> Penolakan dokumen bersifat final untuk alur saat ini.
                  Drafter akan menerima notifikasi penolakan beserta alasan/catatan evaluasi perbaikan yang Anda
                  berikan.
                </span>
              )}
            </div>

            {/* Mandatory Reason Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="reason-input"
                className="block text-xs font-semibold text-slate-700"
              >
                Alasan {modalType === 'cancel' ? 'Pembatalan' : 'Penolakan'}{' '}
                <span className="text-rose-500">* (Wajib Diisi)</span>
              </label>
              <textarea
                id="reason-input"
                rows={3}
                required
                placeholder={
                  modalType === 'cancel'
                    ? 'Masukkan alasan pembatalan surat (misal: perubahan agenda kegiatan, kesalahan data nama, dll)...'
                    : 'Masukkan catatan evaluasi atau alasan penolakan dokumen...'
                }
                value={modalReason}
                onChange={(e) => {
                  setModalReason(e.target.value)
                  if (modalError) setModalError(null)
                }}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 transition resize-none placeholder:text-slate-400 ${
                  modalError
                    ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-600'
                    : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                }`}
              />
              {modalError && (
                <p className="text-xs text-rose-600 font-medium">{modalError}</p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setModalType(null)
                  setModalError(null)
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmModalAction}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50 ${
                  modalType === 'cancel'
                    ? 'bg-slate-800 hover:bg-slate-900'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : modalType === 'cancel' ? (
                  <Ban className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                <span>
                  {modalType === 'cancel'
                    ? 'Konfirmasi Pembatalan'
                    : 'Konfirmasi Penolakan'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
