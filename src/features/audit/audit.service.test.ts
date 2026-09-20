import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuditService } from './audit.service'
import type { IAuditRepository } from './audit.repository'
import type { AuditLog, CreateAuditLogDTO } from './audit.model'

describe('AuditService', () => {
  let mockAuditRepo: IAuditRepository
  let auditService: AuditService

  const sampleLog: AuditLog = {
    id: 'log_test_01',
    timestamp: '2026-09-19T12:00:00Z',
    actionType: 'DOCUMENT_CREATED',
    performedBy: {
      userId: 'usr_drafter_1',
      name: 'Drafter User',
      role: 'drafter',
    },
    targetResource: {
      resourceId: 'ltr_001',
      resourceType: 'letter',
      resourceIdentifier: '001/ST/HR/IX/2026',
    },
    metadata: {
      templateType: 'Surat Tugas',
      newState: 'Draft',
    },
  }

  beforeEach(() => {
    mockAuditRepo = {
      create: vi.fn().mockImplementation((dto: CreateAuditLogDTO) =>
        Promise.resolve({
          id: 'log_generated',
          timestamp: dto.timestamp || new Date().toISOString(),
          ...dto,
        })
      ),
      findAll: vi.fn().mockResolvedValue([sampleLog]),
      subscribeAll: vi.fn().mockImplementation((callback) => {
        callback([sampleLog])
        return vi.fn()
      }),
    }
    auditService = new AuditService(mockAuditRepo)
  })

  it('logs event with immutable schema and captures actor details', async () => {
    const result = await auditService.recordLog({
      actionType: 'DOCUMENT_APPROVED',
      performedBy: {
        userId: 'usr_approver_1',
        name: 'Approver Final',
        role: 'approver',
      },
      targetResource: {
        resourceId: 'ltr_001',
        resourceType: 'letter',
        resourceIdentifier: '001/ST/HR/IX/2026',
      },
      metadata: {
        previousState: 'In Review',
        newState: 'Approved',
      },
    })

    expect(mockAuditRepo.create).toHaveBeenCalledOnce()
    expect(result.actionType).toBe('DOCUMENT_APPROVED')
    expect(result.performedBy.name).toBe('Approver Final')
  })

  it('fetches audit history and respects limits', async () => {
    const logs = await auditService.getAllLogs(50)
    expect(mockAuditRepo.findAll).toHaveBeenCalledWith(50)
    expect(logs).toHaveLength(1)
    expect(logs[0].id).toBe('log_test_01')
  })

  it('subscribes to live audit updates', () => {
    const callback = vi.fn()
    const unsubscribe = auditService.subscribeToLogs(callback, 25)

    expect(mockAuditRepo.subscribeAll).toHaveBeenCalledWith(callback, 25)
    expect(callback).toHaveBeenCalledWith([sampleLog])
    expect(typeof unsubscribe).toBe('function')
  })

  it('filters audit logs by actionType and search query', () => {
    const logs = auditService.filterLogs([sampleLog], {
      actionType: 'DOCUMENT_CREATED',
      searchQuery: 'Surat',
    })
    expect(logs).toHaveLength(1)

    const noMatch = auditService.filterLogs([sampleLog], {
      actionType: 'USER_ROLE_CHANGED',
    })
    expect(noMatch).toHaveLength(0)
  })
})
