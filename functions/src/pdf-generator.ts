import { Readable } from 'stream'
import * as logger from 'firebase-functions/logger'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { getGoogleWorkspaceClients, getDriveTargetFolderId } from './google-client'

export interface GeneratePdfOptions {
  letterId: string
  googleDocTemplateId: string
  contentData?: Record<string, unknown>
  payload?: Record<string, unknown>
  letterNumber: string
  drafterName?: string
  approverName?: string
  approverSignatureUrl?: string
  createdAt?: string
  driveFolderId?: string
}

export interface TemplateMailMergeOptions {
  templateId: string
  letterNumber: string
  date?: string | Date
  drafterName?: string
  approverName?: string
  approverSignatureUrl?: string
  payload?: Record<string, unknown>
  contentData?: Record<string, unknown>
  destinationTitle?: string
  folderId?: string
}

export interface ExportDocToPdfOptions {
  documentId: string
  fileName: string
  folderId?: string
  makePublic?: boolean
  letterId?: string
}

export interface DrivePdfExportResult {
  fileId: string
  fileName: string
  webViewLink: string
  webContentLink: string
  downloadUrl: string
  pdfBuffer: Buffer
}

/**
 * Formats a Date or ISO string into standard Indonesian date format (e.g. 5 September 2026).
 */
export function formatIndonesianDate(isoOrDate?: string | Date): string {
  const date = isoOrDate ? new Date(isoOrDate) : new Date()
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(isNaN(date.getTime()) ? new Date() : date)
}

/**
 * Finds character offset of a text pattern in a Google Docs document structure.
 */
export function findPlaceholderOffset(
  document: any,
  placeholder: string
): { startIndex: number; endIndex: number } | null {
  const content = document?.body?.content
  if (!Array.isArray(content)) return null

  for (const element of content) {
    if (element.paragraph?.elements) {
      for (const pElem of element.paragraph.elements) {
        const text = pElem.textRun?.content
        if (text && text.includes(placeholder)) {
          const indexWithinRun = text.indexOf(placeholder)
          const startIndex = (pElem.startIndex || 0) + indexWithinRun
          const endIndex = startIndex + placeholder.length
          return { startIndex, endIndex }
        }
      }
    }
  }
  return null
}

/**
 * Duplicates a Google Doc template and replaces placeholders using Google Docs batchUpdate.
 * Handles:
 * - Template duplication via Google Drive API
 * - Standard placeholders: {{LETTER_NUMBER}}, {{NOMOR_SURAT}}, {{DATE}}, {{TANGGAL}}, {{DRAFTER_NAME}}, {{APPROVER_NAME}}
 * - Dynamic payload/contentData variables: {{key}} and {{KEY}}
 * - Optional inline E-Signature embedding ({{TANDA_TANGAN}} or {{SIGNATURE}})
 *
 * @returns ID of the newly duplicated and merged Google Doc
 */
export async function duplicateAndMergeTemplate(
  options: TemplateMailMergeOptions
): Promise<string> {
  const {
    templateId,
    letterNumber,
    date,
    drafterName = 'Drafter',
    approverName = 'Pejabat Berwenang',
    approverSignatureUrl,
    payload = {},
    contentData = {},
    destinationTitle,
    folderId,
  } = options

  const { drive, docs } = getGoogleWorkspaceClients()

  // 1. Duplicate template in Google Drive
  const sanitizedNumber = letterNumber.replace(/[\/\\]/g, '_')
  const title = destinationTitle || `Letter_${sanitizedNumber}_${Date.now()}`
  const targetFolder = folderId || getDriveTargetFolderId()

  logger.info(`Duplicating master Google Doc template: ${templateId} into "${title}"`, {
    targetFolder,
  })

  const copyResponse = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: title,
      parents: targetFolder ? [targetFolder] : undefined,
    },
    fields: 'id, name',
  })

  const newDocId = copyResponse.data.id
  if (!newDocId) {
    throw new Error(`Gagal menyalin master template Google Doc (${templateId})`)
  }

  logger.info(`Duplicate Google Doc created with ID: ${newDocId}`)

  // 2. Prepare batchUpdate requests for Google Docs API
  const requests: any[] = []

  // Letter number placeholders
  requests.push({
    replaceAllText: {
      containsText: { text: '{{LETTER_NUMBER}}', matchCase: false },
      replaceText: letterNumber,
    },
  })
  requests.push({
    replaceAllText: {
      containsText: { text: '{{NOMOR_SURAT}}', matchCase: false },
      replaceText: letterNumber,
    },
  })

  // Date placeholders
  const formattedDate = formatIndonesianDate(date)
  requests.push({
    replaceAllText: {
      containsText: { text: '{{DATE}}', matchCase: false },
      replaceText: formattedDate,
    },
  })
  requests.push({
    replaceAllText: {
      containsText: { text: '{{TANGGAL}}', matchCase: false },
      replaceText: formattedDate,
    },
  })
  requests.push({
    replaceAllText: {
      containsText: { text: '{{TANGGAL_SURAT}}', matchCase: false },
      replaceText: formattedDate,
    },
  })

  // Drafter and Approver metadata
  requests.push({
    replaceAllText: {
      containsText: { text: '{{DRAFTER_NAME}}', matchCase: false },
      replaceText: drafterName,
    },
  })
  requests.push({
    replaceAllText: {
      containsText: { text: '{{APPROVER_NAME}}', matchCase: false },
      replaceText: approverName,
    },
  })

  // Merge dynamic payload and contentData fields
  const combinedData: Record<string, unknown> = {
    ...contentData,
    ...payload,
  }

  for (const [key, val] of Object.entries(combinedData)) {
    const stringValue = String(val ?? '')
    requests.push({
      replaceAllText: {
        containsText: { text: `{{${key}}}`, matchCase: false },
        replaceText: stringValue,
      },
    })
    requests.push({
      replaceAllText: {
        containsText: { text: `{{${key.toUpperCase()}}}`, matchCase: false },
        replaceText: stringValue,
      },
    })
  }

  // Handle E-Signature insertion or text fallback
  if (approverSignatureUrl && approverSignatureUrl.startsWith('http')) {
    try {
      const docRes = await docs.documents.get({ documentId: newDocId })
      let offset = findPlaceholderOffset(docRes.data, '{{TANDA_TANGAN}}')
      if (!offset) {
        offset = findPlaceholderOffset(docRes.data, '{{SIGNATURE}}')
      }

      if (offset) {
        requests.push({
          deleteContentRange: {
            range: {
              startIndex: offset.startIndex,
              endIndex: offset.endIndex,
            },
          },
        })
        requests.push({
          insertInlineImage: {
            location: { index: offset.startIndex },
            uri: approverSignatureUrl,
            objectSize: {
              height: { magnitude: 60, unit: 'PT' },
              width: { magnitude: 150, unit: 'PT' },
            },
          },
        })
      } else {
        requests.push({
          replaceAllText: {
            containsText: { text: '{{TANDA_TANGAN}}', matchCase: false },
            replaceText: `[Tertanda: ${approverName}]`,
          },
        })
        requests.push({
          replaceAllText: {
            containsText: { text: '{{SIGNATURE}}', matchCase: false },
            replaceText: `[Tertanda: ${approverName}]`,
          },
        })
      }
    } catch (docErr) {
      logger.warn('Failed to inspect document for inline signature, falling back to text:', docErr)
      requests.push({
        replaceAllText: {
          containsText: { text: '{{TANDA_TANGAN}}', matchCase: false },
          replaceText: `[Tertanda: ${approverName}]`,
        },
      })
      requests.push({
        replaceAllText: {
          containsText: { text: '{{SIGNATURE}}', matchCase: false },
          replaceText: `[Tertanda: ${approverName}]`,
        },
      })
    }
  } else {
    requests.push({
      replaceAllText: {
        containsText: { text: '{{TANDA_TANGAN}}', matchCase: false },
        replaceText: `[Tertanda: ${approverName}]`,
      },
    })
    requests.push({
      replaceAllText: {
        containsText: { text: '{{SIGNATURE}}', matchCase: false },
        replaceText: `[Tertanda: ${approverName}]`,
      },
    })
  }

  // 3. Execute batchUpdate
  await docs.documents.batchUpdate({
    documentId: newDocId,
    requestBody: { requests },
  })

  logger.info(`BatchUpdate applied successfully to document ${newDocId} with ${requests.length} operations`)
  return newDocId
}

/**
 * Exports a Google Doc as a PDF and uploads it to a designated Google Drive folder.
 * Sets appropriate public/sharing permissions and returns the accessible view/download URL.
 */
export async function exportDocToPdfAndUploadToDrive(
  options: ExportDocToPdfOptions
): Promise<DrivePdfExportResult> {
  const {
    documentId,
    fileName,
    folderId,
    makePublic = true,
    letterId,
  } = options

  const { drive } = getGoogleWorkspaceClients()

  logger.info(`Exporting Google Doc ${documentId} to PDF format`)

  // 1. Export Google Doc as PDF binary stream
  const exportResponse = await drive.files.export(
    {
      fileId: documentId,
      mimeType: 'application/pdf',
    },
    { responseType: 'arraybuffer' }
  )

  const pdfBuffer = Buffer.from(exportResponse.data as ArrayBuffer)
  logger.info(`PDF export completed. File size: ${pdfBuffer.length} bytes`)

  // 2. Upload PDF to target Google Drive folder
  const targetFolder = folderId || getDriveTargetFolderId()
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`

  const uploadResponse = await drive.files.create({
    requestBody: {
      name: cleanFileName,
      mimeType: 'application/pdf',
      parents: targetFolder ? [targetFolder] : undefined,
      description: letterId ? `Generated PDF for Letter ID: ${letterId}` : undefined,
    },
    media: {
      mimeType: 'application/pdf',
      body: Readable.from(pdfBuffer),
    },
    fields: 'id, name, webViewLink, webContentLink, size',
  })

  const uploadedFileId = uploadResponse.data.id
  if (!uploadedFileId) {
    throw new Error('Gagal mengunggah file PDF yang diekspor ke Google Drive')
  }

  logger.info(`PDF uploaded to Google Drive with File ID: ${uploadedFileId}`, {
    parents: targetFolder,
    name: cleanFileName,
  })

  // 3. Set public permission if requested (anyone with the link can view/download)
  if (makePublic) {
    try {
      await drive.permissions.create({
        fileId: uploadedFileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      })
      logger.info(`Public read permission applied to Drive file ${uploadedFileId}`)
    } catch (permError) {
      logger.warn(`Could not set public permission on Drive file ${uploadedFileId}:`, permError)
    }
  }

  const webViewLink =
    uploadResponse.data.webViewLink ||
    `https://drive.google.com/file/d/${uploadedFileId}/view`

  const webContentLink =
    uploadResponse.data.webContentLink ||
    `https://drive.google.com/uc?id=${uploadedFileId}&export=download`

  const downloadUrl = webViewLink || webContentLink

  return {
    fileId: uploadedFileId,
    fileName: cleanFileName,
    webViewLink,
    webContentLink,
    downloadUrl,
    pdfBuffer,
  }
}

/**
 * Permanently deletes a temporary file from Google Drive.
 */
export async function deleteGoogleDriveFile(fileId: string): Promise<void> {
  if (!fileId) return
  const { drive } = getGoogleWorkspaceClients()
  try {
    await drive.files.delete({ fileId })
    logger.info(`Temporary Google Drive file deleted successfully: ${fileId}`)
  } catch (err) {
    logger.warn(`Failed to delete temporary Google Drive file ${fileId}:`, err)
    throw err
  }
}

/**
 * Core engine for server-side PDF generation:
 * 1. Duplicates Google Doc master template & merges variables (Drive API + Docs API)
 * 2. Exports rendered document to PDF & uploads to designated Google Drive folder
 * 3. Cleans up temporary Google Doc after PDF is stored
 * 4. Updates Firestore letter status with the view/download URL
 */
export async function generatePdfFromGoogleDoc(options: GeneratePdfOptions): Promise<string> {
  const {
    letterId,
    googleDocTemplateId,
    contentData = {},
    payload = {},
    letterNumber,
    drafterName = 'Drafter',
    approverName = 'Pejabat Berwenang',
    approverSignatureUrl,
    createdAt,
    driveFolderId,
  } = options

  const db = getFirestore()
  let temporaryDocId: string | null = null
  let isCleanedUp = false

  logger.info(`Starting Server-Side PDF Generation for Letter ID: ${letterId}`, {
    letterNumber,
    googleDocTemplateId,
    hasSignature: Boolean(approverSignatureUrl),
    driveFolderId,
  })

  try {
    const clients = getGoogleWorkspaceClients()

    // -------------------------------------------------------------
    // SIMULATION / MOCK MODE (For offline test suites & local demo)
    // -------------------------------------------------------------
    if (clients.isMockMode) {
      logger.info(`[MOCK MODE] Simulating Google Workspace PDF generation for ${letterId}`)
      const destination = `final_letters/${letterId}.pdf`
      const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET || 'koneksi-app-dev.appspot.com'
      const mockPdfUrl = `https://storage.googleapis.com/${bucketName}/${destination}`

      try {
        const bucket = getStorage().bucket(process.env.VITE_FIREBASE_STORAGE_BUCKET || undefined)
        const file = bucket.file(destination)
        const mockPdfContent = Buffer.from(
          `%PDF-1.4\n% Mock PDF for Letter ${letterNumber} (ID: ${letterId})\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n215\n%%EOF`
        )
        await file.save(mockPdfContent, {
          contentType: 'application/pdf',
          metadata: { metadata: { letterId, letterNumber } },
        })
      } catch (storageErr) {
        logger.warn('Mock Storage save skipped or failed, using standard mock URL', storageErr)
      }

      await db.collection('letters').doc(letterId).update({
        status: 'Approved',
        finalPdfUrl: mockPdfUrl,
        pdfError: null,
        updatedAt: new Date().toISOString(),
      })

      return mockPdfUrl
    }

    // -------------------------------------------------------------
    // LANGKAH 1: Duplikasi & Mail Merge Template (Drive & Docs API)
    // -------------------------------------------------------------
    const sanitizedNumber = letterNumber.replace(/[\/\\]/g, '_')
    temporaryDocId = await duplicateAndMergeTemplate({
      templateId: googleDocTemplateId,
      letterNumber,
      date: createdAt,
      drafterName,
      approverName,
      approverSignatureUrl,
      contentData,
      payload,
      destinationTitle: `Letter_${sanitizedNumber}_${letterId}`,
      folderId: driveFolderId,
    })

    // -------------------------------------------------------------
    // LANGKAH 2: Ekspor PDF & Simpan ke Google Drive Folder
    // -------------------------------------------------------------
    const exportResult = await exportDocToPdfAndUploadToDrive({
      documentId: temporaryDocId,
      fileName: `Letter_${sanitizedNumber}_${letterId}.pdf`,
      folderId: driveFolderId,
      makePublic: true,
      letterId,
    })

    // Opsional: Simpan salinan ke Firebase Storage jika bucket dikonfigurasi
    if (process.env.VITE_FIREBASE_STORAGE_BUCKET) {
      try {
        const bucket = getStorage().bucket(process.env.VITE_FIREBASE_STORAGE_BUCKET)
        const storageDestination = `final_letters/${letterId}.pdf`
        const file = bucket.file(storageDestination)
        await file.save(exportResult.pdfBuffer, {
          contentType: 'application/pdf',
          metadata: { metadata: { letterId, letterNumber } },
        })
      } catch (storageErr) {
        logger.warn('Dual-upload to Firebase Storage skipped or failed:', storageErr)
      }
    }

    // -------------------------------------------------------------
    // LANGKAH 3: Hapus Google Doc Sementara (Cleanup)
    // -------------------------------------------------------------
    try {
      await deleteGoogleDriveFile(temporaryDocId)
      isCleanedUp = true
    } catch (delErr) {
      logger.warn(`Could not delete temporary doc ${temporaryDocId}`, delErr)
    }

    // -------------------------------------------------------------
    // LANGKAH 4: Perbarui Status Surat di Firestore
    // -------------------------------------------------------------
    const finalUrl = exportResult.downloadUrl || exportResult.webViewLink
    await db.collection('letters').doc(letterId).update({
      status: 'Approved',
      finalPdfUrl: finalUrl,
      pdfDriveFileId: exportResult.fileId,
      pdfError: null,
      updatedAt: new Date().toISOString(),
    })

    logger.info(`Letter ${letterId} successfully processed and updated with PDF URL: ${finalUrl}`)
    return finalUrl
  } catch (error: any) {
    logger.error(`Error processing PDF for letter ${letterId}:`, error)

    try {
      await db.collection('letters').doc(letterId).update({
        status: 'Error PDF',
        pdfError: error?.message || 'Gagal merender PDF via Google Workspace APIs',
        updatedAt: new Date().toISOString(),
      })
    } catch (dbErr) {
      logger.error(`Failed to update letter ${letterId} to Error PDF:`, dbErr)
    }

    throw error
  } finally {
    // Pastikan dokumen sementara di Google Drive selalu terhapus jika belum
    if (temporaryDocId && !isCleanedUp) {
      try {
        await deleteGoogleDriveFile(temporaryDocId)
        logger.info(`Cleaned up temporary doc ${temporaryDocId} in finally block`)
      } catch {
        // Silent catch
      }
    }
  }
}

