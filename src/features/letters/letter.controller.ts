import { useState, useEffect, useCallback } from 'react'
import type { Letter, LetterStatus, ApproverOption, LetterMetrics } from './letter.model'
import { letterService } from './letter.service'

export function useLetterDashboardController() {
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<LetterStatus | 'All'>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [metrics, setMetrics] = useState<LetterMetrics>({
    total: 0,
    totalDrafts: 0,
    pendingApprovals: 0,
    rejected: 0,
    completed: 0,
    draftCount: 0,
    inReviewCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    bookedCount: 0,
    cancelledCount: 0,
  })

  const fetchLetters = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await letterService.getAllLetters()
      setLetters(data)
      // Recalculate immediate in-memory metrics as backup
      setMetrics(letterService.calculateMetrics(data))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data surat'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLetters()
  }, [fetchLetters])

  // Real-time listener for scalable Firestore aggregate statistics
  useEffect(() => {
    setLoadingMetrics(true)
    const unsubscribe = letterService.subscribeMetrics((realtimeMetrics) => {
      setMetrics(realtimeMetrics)
      setLoadingMetrics(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const filteredLetters = letters.filter((letter) => {
    const matchesStatus =
      statusFilter === 'All' ||
      letter.status === statusFilter ||
      ((statusFilter === 'Cancelled' || statusFilter === 'Canceled') &&
        (letter.status === 'Cancelled' || letter.status === 'Canceled'))
    const matchesSearch =
      letter.letterNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.templateType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.drafterName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return {
    letters: filteredLetters,
    rawLetters: letters,
    metrics,
    loading,
    loadingMetrics,
    error,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    refresh: fetchLetters,
  }
}

export function useCreateLetterController() {
  const [templateType, setTemplateType] = useState<string>('Surat Tugas')
  const [jenisSurat, setJenisSurat] = useState<string>('Surat Internal')
  const department = 'HR'
  const [reviewerId, setReviewerId] = useState<string>('')
  const [approverId, setApproverId] = useState<string>('')

  const [formData, setFormData] = useState<Record<string, string>>({
    recipientName: '',
    recipientNik: '',
    position: '',
    destination: '',
    purpose: '',
    startDate: '',
    endDate: '',
    violationDate: '',
    violationReason: '',
    effectiveDate: '',
  })

  const [candidates, setCandidates] = useState<{ reviewers: ApproverOption[]; approvers: ApproverOption[] }>({
    reviewers: [],
    approvers: [],
  })
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Load available reviewers and approvers
  useEffect(() => {
    let isMounted = true
    const loadCandidates = async () => {
      setLoadingCandidates(true)
      try {
        const options = await letterService.getApprovalOptions()
        if (isMounted) {
          setCandidates(options)
          if (options.reviewers.length > 0 && !reviewerId) {
            setReviewerId(options.reviewers[0].uid)
          }
          if (options.approvers.length > 0 && !approverId) {
            setApproverId(options.approvers[0].uid)
          }
        }
      } catch (err) {
        console.warn('Gagal memuat kandidat approval:', err)
      } finally {
        if (isMounted) setLoadingCandidates(false)
      }
    }

    loadCandidates()
    return () => {
      isMounted = false
    }
  }, [])

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }, [])

  const handleTemplateChange = useCallback((newTemplate: string) => {
    setTemplateType(newTemplate)
    setError(null)
  }, [])

  const submitLetterDraft = async (
    drafterId: string,
    drafterName: string
  ): Promise<Letter | null> => {
    setLoading(true)
    setError(null)
    setFeedback(null)

    try {
      const created = await letterService.createLetterDraft(
        {
          templateType,
          department,
          jenisSurat,
          contentData: formData,
          reviewerId: reviewerId || undefined,
          approverId,
        },
        drafterId,
        drafterName,
        candidates
      )

      setFeedback(`Draf surat "${created.letterNumber}" berhasil disimpan! Mengalihkan ke dashboard...`)
      return created
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan draf surat'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }

  const resetForm = useCallback(() => {
    setFormData({
      recipientName: '',
      recipientNik: '',
      position: '',
      destination: '',
      purpose: '',
      startDate: '',
      endDate: '',
      violationDate: '',
      violationReason: '',
      effectiveDate: '',
    })
    setError(null)
    setFeedback(null)
  }, [])

  return {
    templateType,
    department,
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
    resetForm,
    clearError: () => setError(null),
  }
}

export { useLetterDetailController } from './letter-detail.controller'
