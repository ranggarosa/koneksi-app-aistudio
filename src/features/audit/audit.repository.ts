import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/config/firebase'
import type { AuditLog, CreateAuditLogDTO } from './audit.model'

export interface IAuditRepository {
  create(dto: CreateAuditLogDTO): Promise<AuditLog>
  findAll(limitCount?: number): Promise<AuditLog[]>
  subscribeAll(callback: (logs: AuditLog[]) => void, limitCount?: number): () => void
}

function cleanUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanUndefinedFields(value)
      } else {
        result[key] = value
      }
    }
  }
  return result
}

class AuditRepository implements IAuditRepository {
  private inMemoryLogs: AuditLog[] = [
    {
      id: 'log_init_001',
      timestamp: '2026-09-01T08:30:00Z',
      actionType: 'DOCUMENT_CREATED',
      performedBy: {
        userId: 'usr_001',
        name: 'Ahmad Drafter',
        role: 'drafter',
      },
      targetResource: {
        resourceId: 'ltr_001',
        resourceType: 'letter',
        resourceIdentifier: '0051.ST/HR/IX/2026',
      },
      metadata: {
        templateType: 'Surat Tugas',
        newState: 'Approved',
      },
    },
    {
      id: 'log_init_002',
      timestamp: '2026-09-02T10:00:00Z',
      actionType: 'DOCUMENT_APPROVED',
      performedBy: {
        userId: 'usr_003',
        name: 'Hendra Approver',
        role: 'approver',
      },
      targetResource: {
        resourceId: 'ltr_001',
        resourceType: 'letter',
        resourceIdentifier: '0051.ST/HR/IX/2026',
      },
      metadata: {
        previousState: 'In Review',
        newState: 'Approved',
        notes: 'Persetujuan final selesai',
      },
    },
  ]

  /**
   * Writes an immutable audit log record to Firestore or in-memory fallback.
   */
  async create(dto: CreateAuditLogDTO): Promise<AuditLog> {
    const timestamp = dto.timestamp || new Date().toISOString()
    const logData: Omit<AuditLog, 'id'> = {
      timestamp,
      actionType: dto.actionType,
      performedBy: {
        userId: dto.performedBy.userId || 'system',
        name: dto.performedBy.name || 'System User',
        email: dto.performedBy.email,
        role: dto.performedBy.role,
      },
      targetResource: {
        resourceId: dto.targetResource.resourceId,
        resourceType: dto.targetResource.resourceType,
        resourceIdentifier: dto.targetResource.resourceIdentifier,
      },
      metadata: dto.metadata || {},
    }

    if (isFirebaseConfigured) {
      try {
        const auditCol = collection(db, 'audit_logs')
        const cleanedData = cleanUndefinedFields(logData)
        const docRef = await addDoc(auditCol, cleanedData)
        return {
          id: docRef.id,
          ...logData,
        }
      } catch (err) {
        console.warn('Gagal menyimpan audit log ke Firestore, menggunakan in-memory fallback:', err)
      }
    }

    // In-memory fallback
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...logData,
    }
    this.inMemoryLogs.unshift(newLog)
    return newLog
  }

  /**
   * Reads audit log records in descending order (most recent first).
   */
  async findAll(limitCount: number = 100): Promise<AuditLog[]> {
    if (isFirebaseConfigured) {
      try {
        const auditCol = collection(db, 'audit_logs')
        const q = query(auditCol, orderBy('timestamp', 'desc'), firestoreLimit(limitCount))
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          const items: AuditLog[] = []
          snapshot.forEach((d) => {
            const data = d.data()
            items.push({
              id: d.id,
              timestamp: data.timestamp || new Date().toISOString(),
              actionType: data.actionType || 'UNKNOWN_ACTION',
              performedBy: data.performedBy || { userId: '', name: 'Unknown' },
              targetResource: data.targetResource || { resourceId: '', resourceType: 'letter' },
              metadata: data.metadata || {},
            })
          })
          return items
        }
      } catch (err) {
        console.warn('Gagal membaca koleksi audit_logs dari Firestore:', err)
      }
    }

    return [...this.inMemoryLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitCount)
  }

  /**
   * Subscribes to real-time audit log stream.
   */
  subscribeAll(callback: (logs: AuditLog[]) => void, limitCount: number = 100): () => void {
    if (isFirebaseConfigured) {
      try {
        const auditCol = collection(db, 'audit_logs')
        const q = query(auditCol, orderBy('timestamp', 'desc'), firestoreLimit(limitCount))
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const items: AuditLog[] = []
            snapshot.forEach((d) => {
              const data = d.data()
              items.push({
                id: d.id,
                timestamp: data.timestamp || new Date().toISOString(),
                actionType: data.actionType || 'UNKNOWN_ACTION',
                performedBy: data.performedBy || { userId: '', name: 'Unknown' },
                targetResource: data.targetResource || { resourceId: '', resourceType: 'letter' },
                metadata: data.metadata || {},
              })
            })
            callback(items)
          },
          (err) => {
            console.warn('Error onSnapshot audit_logs listener:', err)
            this.findAll(limitCount).then(callback)
          }
        )
        return unsubscribe
      } catch (err) {
        console.warn('Gagal setup onSnapshot audit_logs listener:', err)
      }
    }

    // Local in-memory polling fallback
    this.findAll(limitCount).then(callback)
    const interval = setInterval(() => {
      this.findAll(limitCount).then(callback)
    }, 2000)
    return () => clearInterval(interval)
  }
}

export const auditRepository = new AuditRepository()
