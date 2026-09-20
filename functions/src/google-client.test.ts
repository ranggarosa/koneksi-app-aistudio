import {
  getGoogleWorkspaceAuth,
  getGoogleWorkspaceClients,
  resetGoogleWorkspaceClients,
  formatPrivateKey,
  parseServiceAccountKey,
  getDriveClient,
  getDocsClient,
  getDriveTargetFolderId,
} from './google-client'
import { google } from 'googleapis'

// Mock googleapis
jest.mock('googleapis', () => {
  const mGoogleAuth = jest.fn().mockImplementation((options) => ({
    type: 'GoogleAuth',
    options,
  }))
  const mJWT = jest.fn().mockImplementation((options) => ({
    type: 'JWT',
    options,
  }))
  const mDrive = jest.fn().mockReturnValue({ files: {} })
  const mDocs = jest.fn().mockReturnValue({ documents: {} })

  return {
    google: {
      auth: {
        GoogleAuth: mGoogleAuth,
        JWT: mJWT,
      },
      drive: mDrive,
      docs: mDocs,
    },
  }
})

describe('google-client - Service Account Authentication & Client Factory', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...ORIGINAL_ENV }
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    delete process.env.GOOGLE_PRIVATE_KEY
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  describe('getGoogleWorkspaceAuth', () => {
    it('initializes GoogleAuth with JSON credentials from GOOGLE_SERVICE_ACCOUNT_KEY', () => {
      const mockCredentials = {
        client_email: 'sa@project.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...\n-----END PRIVATE KEY-----',
      }
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(mockCredentials)

      const auth: any = getGoogleWorkspaceAuth()

      expect(google.auth.GoogleAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: mockCredentials,
          scopes: [
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/drive',
          ],
        })
      )
      expect(auth.type).toBe('GoogleAuth')
    })

    it('initializes GoogleAuth with base64 encoded GOOGLE_SERVICE_ACCOUNT_KEY', () => {
      const mockCredentials = {
        client_email: 'base64-sa@project.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nMockKey\n-----END PRIVATE KEY-----',
      }
      const base64Key = Buffer.from(JSON.stringify(mockCredentials)).toString('base64')
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = base64Key

      const auth: any = getGoogleWorkspaceAuth()

      expect(google.auth.GoogleAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: mockCredentials,
        })
      )
      expect(auth.type).toBe('GoogleAuth')
    })

    it('initializes JWT auth when GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY are set', () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'jwt-sa@project.iam.gserviceaccount.com'
      process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nline1\\nline2\\n-----END PRIVATE KEY-----'

      const auth: any = getGoogleWorkspaceAuth()

      expect(google.auth.JWT).toHaveBeenCalledWith({
        email: 'jwt-sa@project.iam.gserviceaccount.com',
        key: '-----BEGIN PRIVATE KEY-----\nline1\nline2\n-----END PRIVATE KEY-----',
        scopes: [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive',
        ],
      })
      expect(auth.type).toBe('JWT')
    })

    it('falls back to Application Default Credentials (ADC) when no env credentials are provided', () => {
      const auth: any = getGoogleWorkspaceAuth()

      expect(google.auth.GoogleAuth).toHaveBeenCalledWith({
        scopes: [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive',
        ],
      })
      expect(auth.type).toBe('GoogleAuth')
    })

    it('falls through to ADC if GOOGLE_SERVICE_ACCOUNT_KEY contains invalid JSON', () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = 'not-valid-json'

      const auth: any = getGoogleWorkspaceAuth()

      expect(google.auth.GoogleAuth).toHaveBeenCalledWith({
        scopes: [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive',
        ],
      })
      expect(auth.type).toBe('GoogleAuth')
    })
  })

  describe('getGoogleWorkspaceClients', () => {
    it('initializes Drive and Docs clients and caches them', () => {
      const clients1 = getGoogleWorkspaceClients()
      expect(clients1).toBeDefined()
      expect(clients1.drive).toBeDefined()
      expect(clients1.docs).toBeDefined()
      expect(typeof clients1.isMockMode).toBe('boolean')

      // Second call returns cached instance
      const clients2 = getGoogleWorkspaceClients()
      expect(clients2).toBe(clients1)
    })

    it('clears cached clients on resetGoogleWorkspaceClients', () => {
      const clients1 = getGoogleWorkspaceClients()
      resetGoogleWorkspaceClients()
      const clients2 = getGoogleWorkspaceClients()
      expect(clients2).not.toBe(clients1)
    })
  })

  describe('Utility & Helper Functions', () => {
    it('formats escaped private key newlines correctly', () => {
      expect(formatPrivateKey('key\\nline1\\nline2')).toBe('key\nline1\nline2')
      expect(formatPrivateKey('')).toBe('')
    })

    it('parses valid JSON service account key string', () => {
      const json = JSON.stringify({ client_email: 'test@example.com' })
      const parsed = parseServiceAccountKey(json)
      expect(parsed?.client_email).toBe('test@example.com')
    })

    it('returns null on invalid service account key', () => {
      expect(parseServiceAccountKey('invalid-json')).toBeNull()
      expect(parseServiceAccountKey('')).toBeNull()
    })

    it('creates drive and docs clients directly via factories', () => {
      const drive = getDriveClient()
      const docs = getDocsClient()
      expect(drive).toBeDefined()
      expect(docs).toBeDefined()
    })

    it('reads target folder ID from environment', () => {
      process.env.GOOGLE_DRIVE_FOLDER_ID = 'folder_xyz_123'
      expect(getDriveTargetFolderId()).toBe('folder_xyz_123')
    })
  })
})

