import axios from 'axios'

/** Max task attachment size (must match Laravel `max:10240` kilobytes). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENT_LABEL = '10 MB'
export const ATTACHMENT_TOO_LARGE_MESSAGE = `File exceeds the ${MAX_ATTACHMENT_LABEL} limit.`

/** Extract a user-friendly message from Laravel / Axios errors. */
export function getApiError(error: unknown, fallback = 'Something went wrong'): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message) return error.message
    return fallback
  }

  // nginx / reverse-proxy rejects body before Laravel (often oversized uploads)
  if (error.response?.status === 413) {
    return ATTACHMENT_TOO_LARGE_MESSAGE
  }

  const data = error.response?.data as
    | { message?: string; errors?: Record<string, string[] | string> }
    | undefined

  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors)[0]
    if (Array.isArray(first) && first[0]) return friendlyUploadMessage(first[0])
    if (typeof first === 'string') return friendlyUploadMessage(first)
  }

  if (data?.message) return friendlyUploadMessage(data.message)

  if (error.response?.status === 401) return 'Unauthorized. Please sign in again.'
  if (error.response?.status === 403) return 'You do not have permission for this action.'
  if (error.response?.status === 404) return 'Resource not found.'
  if (error.response?.status === 422) return 'Please check the form and try again.'
  if (error.response?.status && error.response.status >= 500) {
    return 'Server error. Please try again later.'
  }

  if (error.code === 'ERR_NETWORK') {
    return 'Cannot reach the API. Is the Laravel server running?'
  }

  return fallback
}

function friendlyUploadMessage(message: string): string {
  const lower = message.toLowerCase()
  if (
    lower.includes('10240') ||
    (lower.includes('greater than') && lower.includes('kilobyte')) ||
    lower.includes('content too large') ||
    lower.includes('entity too large') ||
    lower.includes('file is too large') ||
    lower.includes('exceeds the 10')
  ) {
    return ATTACHMENT_TOO_LARGE_MESSAGE
  }
  return message
}
