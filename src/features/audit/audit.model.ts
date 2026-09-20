export type AuditActionType =
  | 'DOCUMENT_CREATED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_CANCELLED'
  | 'USER_ROLE_CHANGED'
  | 'DOCUMENT_UPDATED'

export interface AuditActor {
  userId: string
  name: string
  email?: string
  role?: string
}

export type AuditResourceType = 'letter' | 'user' | 'document' | 'setting'

export interface AuditTargetResource {
  resourceId: string
  resourceType: AuditResourceType | string
  resourceIdentifier?: string // e.g. letterNumber or target user name/email
}

export interface AuditLogMetadata {
  previousState?: string | Record<string, unknown>
  newState?: string | Record<string, unknown>
  reason?: string
  notes?: string
  letterNumber?: string
  templateType?: string
  previousRole?: string
  newRole?: string
  stepRole?: string
  ipAddress?: string
  [key: string]: unknown
}

export interface AuditLog {
  id: string
  timestamp: string // ISO 8601 string
  actionType: AuditActionType | string
  performedBy: AuditActor
  targetResource: AuditTargetResource
  metadata?: AuditLogMetadata
}

export interface CreateAuditLogDTO {
  actionType: AuditActionType | string
  performedBy: AuditActor
  targetResource: AuditTargetResource
  metadata?: AuditLogMetadata
  timestamp?: string
}

export interface AuditLogFilter {
  actionType?: AuditActionType | 'ALL'
  resourceType?: AuditResourceType | 'ALL'
  search?: string
  startDate?: string
  endDate?: string
  userId?: string
}
