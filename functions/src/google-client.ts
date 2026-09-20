import { google, drive_v3, docs_v1 } from 'googleapis'
import * as logger from 'firebase-functions/logger'

/**
 * Scopes required for Google Drive and Google Docs operations:
 * - documents: reading template contents and batchUpdate text/image insertion
 * - drive: file creation, duplication, export to PDF, and cleanup
 */
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
]

export interface ServiceAccountCredentials {
  type?: string
  project_id?: string
  private_key_id?: string
  private_key?: string
  client_email?: string
  client_id?: string
  auth_uri?: string
  token_uri?: string
  auth_provider_x509_cert_url?: string
  client_x509_cert_url?: string
  [key: string]: unknown
}

export interface GoogleWorkspaceAuthConfig {
  serviceAccountKey?: string
  serviceAccountEmail?: string
  privateKey?: string
  keyFilePath?: string
  driveFolderId?: string
  scopes?: string[]
}

export interface GoogleClients {
  drive: drive_v3.Drive
  docs: docs_v1.Docs
  auth: any
  isMockMode: boolean
}

let cachedClients: GoogleClients | null = null

/**
 * Normalizes private keys by replacing escaped newline characters (`\n`)
 * with actual newlines.
 */
export function formatPrivateKey(key: string): string {
  if (!key) return ''
  return key.replace(/\\n/g, '\n')
}

/**
 * Parses and decodes a Service Account Key string.
 * Supports:
 * - Direct JSON string (starts with '{')
 * - Base64 encoded JSON string
 */
export function parseServiceAccountKey(keyString: string): ServiceAccountCredentials | null {
  if (!keyString || !keyString.trim()) {
    return null
  }

  const trimmed = keyString.trim()
  try {
    const decoded = trimmed.startsWith('{')
      ? trimmed
      : Buffer.from(trimmed, 'base64').toString('utf8')
    return JSON.parse(decoded) as ServiceAccountCredentials
  } catch (err) {
    logger.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON string or base64 payload', err)
    return null
  }
}

/**
 * Creates Google Auth credentials from environment variables or custom config.
 * Priority order:
 * 1. `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON string or base64 encoded JSON)
 * 2. `GOOGLE_SERVICE_ACCOUNT_EMAIL` & `GOOGLE_PRIVATE_KEY` (JWT Auth)
 * 3. `GOOGLE_APPLICATION_CREDENTIALS` (File path)
 * 4. Google Application Default Credentials (ADC) for Cloud Run / GCP environments
 */
export function createServiceAccountAuth(config?: Partial<GoogleWorkspaceAuthConfig>) {
  const scopes = config?.scopes || WORKSPACE_SCOPES

  // 1. Check explicit JSON Service Account Key
  const rawKey = config?.serviceAccountKey || process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (rawKey) {
    const credentials = parseServiceAccountKey(rawKey)
    if (credentials) {
      logger.info('Authenticated using Service Account credentials from GOOGLE_SERVICE_ACCOUNT_KEY')
      return new google.auth.GoogleAuth({
        credentials,
        scopes,
      })
    }
  }

  // 2. Check Service Account Email & Private Key pair
  const saEmail = config?.serviceAccountEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const saPrivateKey = config?.privateKey || process.env.GOOGLE_PRIVATE_KEY
  if (saEmail && saPrivateKey) {
    logger.info('Authenticated using JWT with GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY')
    return new google.auth.JWT({
      email: saEmail,
      key: formatPrivateKey(saPrivateKey),
      scopes,
    })
  }

  // 3. Check Service Account Key file path
  const keyFilePath = config?.keyFilePath || process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (keyFilePath) {
    logger.info(`Authenticated using Service Account key file from ${keyFilePath}`)
    return new google.auth.GoogleAuth({
      keyFilename: keyFilePath,
      scopes,
    })
  }

  // 4. Fallback to Google Application Default Credentials (ADC)
  logger.info('Falling back to Google Application Default Credentials (ADC)')
  return new google.auth.GoogleAuth({
    scopes,
  })
}

/**
 * Returns Google Workspace Auth instance.
 */
export function getGoogleWorkspaceAuth(config?: Partial<GoogleWorkspaceAuthConfig>) {
  return createServiceAccountAuth(config)
}

/**
 * Factory for Google Drive v3 client.
 */
export function getDriveClient(auth?: any): drive_v3.Drive {
  const resolvedAuth = auth || getGoogleWorkspaceAuth()
  return google.drive({ version: 'v3', auth: resolvedAuth as any })
}

/**
 * Factory for Google Docs v1 client.
 */
export function getDocsClient(auth?: any): docs_v1.Docs {
  const resolvedAuth = auth || getGoogleWorkspaceAuth()
  return google.docs({ version: 'v1', auth: resolvedAuth as any })
}

/**
 * Retrieves target Google Drive folder ID for storing generated PDFs.
 */
export function getDriveTargetFolderId(): string | undefined {
  return process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || undefined
}

/**
 * Checks whether mock mode is enabled (for local tests or offline dev).
 */
export function isMockModeActive(): boolean {
  return (
    process.env.PDF_MOCK_MODE === 'true' ||
    process.env.NODE_ENV === 'test'
  )
}

/**
 * Initializes and returns Google Workspace clients for Drive and Docs.
 * Supports caching and forced refresh.
 */
export function getGoogleWorkspaceClients(options?: {
  forceRefresh?: boolean
  config?: Partial<GoogleWorkspaceAuthConfig>
}): GoogleClients {
  if (cachedClients && !options?.forceRefresh) {
    return cachedClients
  }

  const isMockMode = isMockModeActive()

  try {
    const auth = getGoogleWorkspaceAuth(options?.config)
    const drive = getDriveClient(auth)
    const docs = getDocsClient(auth)

    cachedClients = { drive, docs, auth, isMockMode }
    return cachedClients
  } catch (error) {
    logger.warn('Could not initialize live Google Workspace client, falling back to mock mode if enabled:', error)
    if (isMockMode) {
      cachedClients = {
        drive: {} as any,
        docs: {} as any,
        auth: {} as any,
        isMockMode: true,
      }
      return cachedClients
    }
    throw error
  }
}

/**
 * Resets the cached Google Workspace clients.
 */
export function resetGoogleWorkspaceClients(): void {
  cachedClients = null
}

