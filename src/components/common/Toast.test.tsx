import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToastProvider, useToast } from './Toast'

const TestConsumer: React.FC = () => {
  const toast = useToast()

  return (
    <div>
      <button
        onClick={() =>
          toast.showToast({
            type: 'success',
            title: 'Berhasil',
            message: 'Surat berhasil diajukan',
            duration: 3000,
          })
        }
      >
        Trigger Success
      </button>
      <button
        onClick={() =>
          toast.showToast({
            type: 'error',
            title: 'Gagal',
            message: 'Terjadi kesalahan sistem',
            duration: 3000,
          })
        }
      >
        Trigger Error
      </button>
      <button
        onClick={() =>
          toast.showToast({
            type: 'warning',
            title: 'Peringatan',
            message: 'Data belum lengkap',
          })
        }
      >
        Trigger Warning
      </button>
      <button
        onClick={() =>
          toast.showToast({
            type: 'info',
            title: 'Informasi',
            message: 'Proses sedang berlangsung',
          })
        }
      >
        Trigger Info
      </button>
    </div>
  )
}

describe('Toast Component & ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders children and allows triggering a success toast', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    expect(screen.getByText('Trigger Success')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Trigger Success'))

    expect(screen.getByText('Berhasil')).toBeInTheDocument()
    expect(screen.getByText('Surat berhasil diajukan')).toBeInTheDocument()
  })

  it('renders different toast types properly', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Trigger Error'))
    expect(screen.getByText('Gagal')).toBeInTheDocument()
    expect(screen.getByText('Terjadi kesalahan sistem')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Trigger Warning'))
    expect(screen.getByText('Peringatan')).toBeInTheDocument()
    expect(screen.getByText('Data belum lengkap')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Trigger Info'))
    expect(screen.getByText('Informasi')).toBeInTheDocument()
    expect(screen.getByText('Proses sedang berlangsung')).toBeInTheDocument()
  })

  it('dismisses toast on close button click', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Trigger Success'))
    expect(screen.getByText('Berhasil')).toBeInTheDocument()

    const closeButton = screen.getByRole('button', { name: /tutup/i })
    fireEvent.click(closeButton)

    expect(screen.queryByText('Berhasil')).not.toBeInTheDocument()
  })

  it('auto-dismisses toast after duration', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Trigger Success'))
    expect(screen.getByText('Berhasil')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3100)
    })

    expect(screen.queryByText('Berhasil')).not.toBeInTheDocument()
  })

  it('throws error when useToast is used outside ToastProvider', () => {
    const BadConsumer = () => {
      useToast()
      return <div>Bad</div>
    }

    // Silence console.error from React during expected boundary error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<BadConsumer />)).toThrowError(
      'useToast must be used within a ToastProvider'
    )

    spy.mockRestore()
  })
})
