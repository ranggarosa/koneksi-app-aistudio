export type CanonicalUserRole = 'admin' | 'drafter' | 'reviewer' | 'approver'
export type UserRole = CanonicalUserRole | 'Admin' | 'Drafter' | 'Reviewer' | 'Approver'

export interface User {
  uid: string
  email: string
  displayName: string
  name: string // Alias to maintain backward compatibility with existing views
  role: UserRole
  signatureUrl?: string
  avatarUrl?: string
  department?: string
  createdAt: string
  updatedAt?: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function normalizeRole(role?: string | null): CanonicalUserRole {
  if (!role) return 'drafter'
  const lower = role.trim().toLowerCase()
  if (lower === 'admin') return 'admin'
  if (lower === 'reviewer') return 'reviewer'
  if (lower === 'approver') return 'approver'
  return 'drafter'
}
