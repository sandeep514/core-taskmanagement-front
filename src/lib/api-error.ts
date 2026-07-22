import axios from 'axios'

/** Extract a user-friendly message from Laravel / Axios errors. */
export function getApiError(error: unknown, fallback = 'Something went wrong'): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message) return error.message
    return fallback
  }

  const data = error.response?.data as
    | { message?: string; errors?: Record<string, string[] | string> }
    | undefined

  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors)[0]
    if (Array.isArray(first) && first[0]) return first[0]
    if (typeof first === 'string') return first
  }

  if (data?.message) return data.message

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
