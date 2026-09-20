import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  message: string
  title?: string
  type?: ToastType
  duration?: number
}

export interface ToastMessage {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
}

interface ToastContextValue {
  showToast: (
    messageOrOptions: string | ToastOptions,
    type?: ToastType,
    duration?: number
  ) => void
  success: (message: string, title?: string, duration?: number) => void
  error: (message: string, title?: string, duration?: number) => void
  info: (message: string, title?: string, duration?: number) => void
  warning: (message: string, title?: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (
      messageOrOptions: string | ToastOptions,
      defaultType: ToastType = 'info',
      defaultDuration: number = 4000
    ) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      let type: ToastType = defaultType
      let message = ''
      let title: string | undefined
      let duration: number = defaultDuration

      if (typeof messageOrOptions === 'string') {
        message = messageOrOptions
      } else {
        message = messageOrOptions.message
        title = messageOrOptions.title
        type = messageOrOptions.type || defaultType
        duration = messageOrOptions.duration !== undefined ? messageOrOptions.duration : defaultDuration
      }

      const newToast: ToastMessage = { id, type, title, message, duration }
      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  const success = useCallback(
    (message: string, title?: string, duration?: number) =>
      showToast({ message, title, type: 'success', duration }),
    [showToast]
  )
  const error = useCallback(
    (message: string, title?: string, duration?: number) =>
      showToast({ message, title, type: 'error', duration }),
    [showToast]
  )
  const info = useCallback(
    (message: string, title?: string, duration?: number) =>
      showToast({ message, title, type: 'info', duration }),
    [showToast]
  )
  const warning = useCallback(
    (message: string, title?: string, duration?: number) =>
      showToast({ message, title, type: 'warning', duration }),
    [showToast]
  )

  return (
    <ToastContext.Provider
      value={{
        showToast,
        success,
        error,
        info,
        warning,
        removeToast,
      }}
    >
      {children}
      {/* Toast Floating Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-5 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-indigo-50 border-indigo-200 text-indigo-900'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-600" />}
            </div>

            <div className="flex-1 text-xs leading-relaxed">
              {toast.title && <div className="font-bold mb-0.5">{toast.title}</div>}
              <div className="font-medium">{toast.message}</div>
            </div>

            <button
              type="button"
              aria-label="Tutup"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
