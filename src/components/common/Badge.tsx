import React from 'react'
import type { LetterStatus } from '@/features/letters/letter.model'

interface BadgeProps {
  status: LetterStatus | 'pending' | 'approved' | 'rejected'
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase()

  if (normalized === 'draft') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
        Draft
      </span>
    )
  }

  if (normalized === 'in review' || normalized === 'pending') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
        {status === 'pending' ? 'Pending' : 'In Review'}
      </span>
    )
  }

  if (normalized === 'approved') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
        Approved
      </span>
    )
  }

  if (normalized === 'rejected') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300">
        Rejected
      </span>
    )
  }

  if (normalized === 'booked') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-300">
        Booked
      </span>
    )
  }

  if (normalized === 'canceled' || normalized === 'cancelled') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300 line-through">
        Cancelled
      </span>
    )
  }

  if (normalized === 'processing pdf') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
        Processing PDF
      </span>
    )
  }

  if (normalized === 'error_pdf' || normalized === 'error pdf') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
        Error PDF
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      {status}
    </span>
  )
}
