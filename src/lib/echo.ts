import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Pusher: typeof Pusher
    Echo?: Echo<'reverb'>
  }
}

window.Pusher = Pusher

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api'

function reverbConfig() {
  const key = import.meta.env.VITE_REVERB_APP_KEY as string | undefined
  if (!key) {
    return null
  }

  const host =
    (import.meta.env.VITE_REVERB_HOST as string | undefined) ||
    window.location.hostname ||
    'localhost'
  const port = Number(import.meta.env.VITE_REVERB_PORT ?? 8080)
  const scheme = (import.meta.env.VITE_REVERB_SCHEME as string | undefined) || 'http'
  const forceTLS = scheme === 'https'

  return { key, host, port, scheme, forceTLS }
}

/** Whether realtime is configured (Reverb env present). */
export function isRealtimeEnabled(): boolean {
  return Boolean(import.meta.env.VITE_REVERB_APP_KEY)
}

let echoInstance: Echo<'reverb'> | null = null
let boundToken: string | null = null

/**
 * Get (or recreate) the Laravel Echo client for the current Sanctum token.
 * Returns null when Reverb is not configured.
 */
export function getEcho(token: string | null | undefined): Echo<'reverb'> | null {
  if (!token) {
    disconnectEcho()
    return null
  }

  const cfg = reverbConfig()
  if (!cfg) {
    return null
  }

  if (echoInstance && boundToken === token) {
    return echoInstance
  }

  disconnectEcho()

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: cfg.key,
    wsHost: cfg.host,
    wsPort: cfg.port,
    wssPort: cfg.port,
    forceTLS: cfg.forceTLS,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${API_URL.replace(/\/$/, '')}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  })
  boundToken = token
  window.Echo = echoInstance

  return echoInstance
}

export function disconnectEcho(): void {
  if (echoInstance) {
    try {
      echoInstance.disconnect()
    } catch {
      // ignore
    }
  }
  echoInstance = null
  boundToken = null
  if (window.Echo) {
    delete window.Echo
  }
}
