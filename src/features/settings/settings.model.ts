import type { UserRole } from '@/features/auth/auth.model'

export interface UserProfileSettings {
  uid: string
  name: string
  email: string
  role: UserRole
  signatureUrl?: string
}

export interface ManagedUser {
  uid: string
  name: string
  email: string
  role: UserRole
  department: string
  updatedAt: string
}
