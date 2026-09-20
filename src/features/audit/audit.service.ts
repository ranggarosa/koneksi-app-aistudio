import type { IAuditRepository } from './audit.repository'
import { auditRepository } from './audit.repository'
import type {
  AuditLog,
  CreateAuditLogDTO,
  AuditActor,
  AuditLogFilter,
} from './audit.model'

export interface IAuditService {
  recordLog(dto: CreateAuditLogDTO): Promise<AuditLog>
  logDocumentCreated(params: {
    letterId: string
    letterNumber: string
    templateType: string
    actor: AuditActor
    initialState?: string
  }): Promise<AuditLog>
  logDocumentApproved(params: {
    letterId: string
    letterNumber: string
    actor: AuditActor
    previousState: string
    newState: string
    notes?: string
  }): Promise<AuditLog>
  logDocumentRejected(params: {
    letterId: string
    letterNumber: string
    actor: AuditActor
    reason: string
    previousState: string
  }): Promise<AuditLog>
  logDocumentCancelled(params: {
    letterId: string
    letterNumber: string
    actor: AuditActor
    reason: string
    previousState: string
  }): Promise<AuditLog>
  logUserRoleChanged(params: {
    targetUserId: string
    targetUserName: string
    previousRole: string
    newRole: string
    actor: AuditActor
  }): Promise<AuditLog>
  getAllLogs(limitCount?: number): Promise<AuditLog[]>
  subscribeToLogs(callback: (logs: AuditLog[]) => void, limitCount?: number): () => void
  filterLogs(logs: AuditLog[], filter: AuditLogFilter): AuditLog[]
}

export class AuditService implements IAuditService {
  constructor(private readonly repo: IAuditRepository = auditRepository) {}

  /**
   * Generic method to record an immutable audit log entry.
   */
  async recordLog(dto: CreateAuditLogDTO): Promise<AuditLog> {
    try {
      return await this.repo.create(dto)
    } catch (err) {
      console.error('AuditService: Gagal mencatat log audit:', err)
      // Return safe fallback record to ensure primary business action is not aborted
      return {
        id: `log_fallback_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: dto.actionType,
        performedBy: dto.performedBy,
        targetResource: dto.targetResource,
        metadata: dto.metadata,
      }
    }
  }

  /**
   * Records when a new letter document or draft is created.
   */
  async logDocumentCreated(params: {
    letterId: string
    letterNumber: string
    templateType: string
    actor: AuditActor
    initialState?: string
  }): Promise<AuditLog> {
    return this.recordLog({
      actionType: 'DOCUMENT_CREATED',
      performedBy: params.actor,
      targetResource: {
        resourceId: params.letterId,
        resourceType: 'letter',
        resourceIdentifier: params.letterNumber,
      },
      metadata: {
        templateType: params.templateType,
        letterNumber: params.letterNumber,
        newState: params.initialState || 'In Review',
      },
    })
  }

  /**
   * Records when a document is approved in an approval step.
   */
  async logDocumentApproved(params: {
    letterId: string
    letterNumber: string
    actor: AuditActor
    previousState: string
    newState: string
    notes?: string
  }): Promise<AuditLog> {
    return this.recordLog({
      actionType: 'DOCUMENT_APPROVED',
      performedBy: params.actor,
      targetResource: {
        resourceId: params.letterId,
        resourceType: 'letter',
        resourceIdentifier: params.letterNumber,
      },
      metadata: {
        previousState: params.previousState,
        newState: params.newState,
        notes: params.notes,
        letterNumber: params.letterNumber,
      },
    })
  }

  /**
   * Records when a document is rejected by a reviewer or approver.
   */
  async logDocumentRejected(params: {
    letterId: string
    letterNumber: string
    actor: AuditActor
    reason: string
    previousState: string
  }): Promise<AuditLog> {
    return this.recordLog({
      actionType: 'DOCUMENT_REJECTED',
      performedBy: params.actor,
      targetResource: {
        resourceId: params.letterId,
        resourceType: 'letter',
        resourceIdentifier: params.letterNumber,
      },
      metadata: {
        previousState: params.previousState,
        newState: 'Rejected',
        reason: params.reason,
        letterNumber: params.letterNumber,
      },
    })
  }

  /**
   * Records when a document is cancelled/voided.
   */
  async logDocumentCancelled(params: {
    letterId: string
    letterNumber: string
    actor: AuditActor
    reason: string
    previousState: string
  }): Promise<AuditLog> {
    return this.recordLog({
      actionType: 'DOCUMENT_CANCELLED',
      performedBy: params.actor,
      targetResource: {
        resourceId: params.letterId,
        resourceType: 'letter',
        resourceIdentifier: params.letterNumber,
      },
      metadata: {
        previousState: params.previousState,
        newState: 'Cancelled',
        reason: params.reason,
        letterNumber: params.letterNumber,
      },
    })
  }

  /**
   * Records when a user's system access role is changed.
   */
  async logUserRoleChanged(params: {
    targetUserId: string
    targetUserName: string
    previousRole: string
    newRole: string
    actor: AuditActor
  }): Promise<AuditLog> {
    return this.recordLog({
      actionType: 'USER_ROLE_CHANGED',
      performedBy: params.actor,
      targetResource: {
        resourceId: params.targetUserId,
        resourceType: 'user',
        resourceIdentifier: params.targetUserName,
      },
      metadata: {
        previousRole: params.previousRole,
        newRole: params.newRole,
        targetUserName: params.targetUserName,
      },
    })
  }

  /**
   * Retrieves all audit logs up to a given limit.
   */
  async getAllLogs(limitCount: number = 150): Promise<AuditLog[]> {
    return this.repo.findAll(limitCount)
  }

  /**
   * Subscribes to real-time updates for audit logs.
   */
  subscribeToLogs(callback: (logs: AuditLog[]) => void, limitCount: number = 150): () => void {
    return this.repo.subscribeAll(callback, limitCount)
  }

  /**
   * Filters in-memory logs by actionType, search query, or date range.
   */
  filterLogs(logs: AuditLog[], filter: AuditLogFilter): AuditLog[] {
    return logs.filter((log) => {
      // Action Type filter
      if (filter.actionType && filter.actionType !== 'ALL') {
        if (log.actionType !== filter.actionType) return false
      }

      // Resource Type filter
      if (filter.resourceType && filter.resourceType !== 'ALL') {
        if (log.targetResource.resourceType !== filter.resourceType) return false
      }

      // User filter
      if (filter.userId) {
        if (log.performedBy.userId !== filter.userId) return false
      }

      // Search Query filter
      if (filter.search && filter.search.trim() !== '') {
        const q = filter.search.toLowerCase()
        const matchActor = log.performedBy.name?.toLowerCase().includes(q)
        const matchIdentifier = log.targetResource.resourceIdentifier?.toLowerCase().includes(q)
        const matchAction = log.actionType.toLowerCase().includes(q)
        const matchReason = typeof log.metadata?.reason === 'string' && log.metadata.reason.toLowerCase().includes(q)
        const matchNotes = typeof log.metadata?.notes === 'string' && log.metadata.notes.toLowerCase().includes(q)
        if (!matchActor && !matchIdentifier && !matchAction && !matchReason && !matchNotes) {
          return false
        }
      }

      return true
    })
  }
}

export const auditService = new AuditService(auditRepository)
