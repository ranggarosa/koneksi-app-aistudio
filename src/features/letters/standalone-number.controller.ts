import { useState } from 'react'
import type { BookedLetterResult, BookLetterNumberDTO } from './letter.model'
import { letterService } from './letter.service'
import { useAuthController } from '@/features/auth/auth.controller'

function getTodayString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useStandaloneNumberController() {
  const { user } = useAuthController()

  const [templateType, setTemplateType] = useState<string>('Surat Tugas')
  const [issuedDate, setIssuedDate] = useState<string>(getTodayString())
  const [purpose, setPurpose] = useState<string>('')

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [bookedResult, setBookedResult] = useState<BookedLetterResult | null>(null)
  const [copied, setCopied] = useState<boolean>(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    setError(null)
    setLoading(true)

    try {
      if (!user) {
        throw new Error('Sesi pengguna tidak ditemukan. Silakan login terlebih dahulu.')
      }

      const dto: BookLetterNumberDTO = {
        templateType,
        issuedDate,
        purpose,
      }

      const createdLetter = await letterService.bookLetterNumber(dto, user.uid, user.name)

      setBookedResult({
        letterId: createdLetter.letterId,
        letterNumber: createdLetter.letterNumber,
        templateType: createdLetter.templateType,
        purpose: String(createdLetter.contentData?.purpose || purpose),
        issuedDate: String(createdLetter.contentData?.issuedDate || issuedDate),
        bookedBy: createdLetter.drafterName,
        createdAt: createdLetter.createdAt,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat mem-booking nomor surat'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!bookedResult?.letterNumber) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(bookedResult.letterNumber)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = bookedResult.letterNumber
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.warn('Gagal menyalin nomor surat:', err)
    }
  }

  const resetForm = () => {
    setPurpose('')
    setIssuedDate(getTodayString())
    setBookedResult(null)
    setSuccess(false)
    setError(null)
    setCopied(false)
  }

  return {
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
  }
}
