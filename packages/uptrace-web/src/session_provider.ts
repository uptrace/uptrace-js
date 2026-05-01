import { SessionProvider } from '@opentelemetry/web-common'

export const DEFAULT_SESSION_TIMEOUT_MS = 15 * 60 * 1000
export const DEFAULT_MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface BrowserSession {
  id: string
  startedAt: number
  lastSeenAt: number
}

export interface BrowserSessionProviderConfig {
  storageKey: string
  sessionTimeoutMs?: number
  maxSessionAgeMs?: number
}

export class BrowserSessionProvider implements SessionProvider {
  private _session?: BrowserSession

  constructor(private readonly _config: BrowserSessionProviderConfig) {}

  getSessionId(): string | null {
    return this.getSession().id
  }

  getSession(): BrowserSession {
    const now = Date.now()
    const saved = this._session ?? readStoredSession(this._config.storageKey)
    if (saved && this.isReusable(saved, now)) {
      this._session = {
        ...saved,
        lastSeenAt: now,
      }
      this.save()
      return this._session
    }

    this._session = {
      id: newSessionID(),
      startedAt: now,
      lastSeenAt: now,
    }
    this.save()
    return this._session
  }

  private isReusable(session: BrowserSession, now: number): boolean {
    return (
      now - session.lastSeenAt <= this.sessionTimeoutMs() &&
      now - session.startedAt <= this.maxSessionAgeMs()
    )
  }

  private sessionTimeoutMs(): number {
    const value = this._config.sessionTimeoutMs
    if (value === undefined) {
      return DEFAULT_SESSION_TIMEOUT_MS
    }
    return Math.min(value, DEFAULT_SESSION_TIMEOUT_MS)
  }

  private maxSessionAgeMs(): number {
    return this._config.maxSessionAgeMs ?? DEFAULT_MAX_SESSION_AGE_MS
  }

  private save(): void {
    if (!this._session) {
      return
    }
    try {
      localStorage.setItem(this._config.storageKey, JSON.stringify(this._session))
    } catch {}
  }
}

export function isUUID(value: string): boolean {
  return UUID_RE.test(value)
}

function readStoredSession(storageKey: string): BrowserSession | undefined {
  let value: string | null
  try {
    value = localStorage.getItem(storageKey)
  } catch {
    return undefined
  }
  if (!value) {
    return undefined
  }

  try {
    const parsed = JSON.parse(value)
    if (
      typeof parsed.id === 'string' &&
      isUUID(parsed.id) &&
      typeof parsed.startedAt === 'number' &&
      Number.isFinite(parsed.startedAt) &&
      typeof parsed.lastSeenAt === 'number' &&
      Number.isFinite(parsed.lastSeenAt)
    ) {
      return parsed
    }
  } catch {}
  return undefined
}

function newSessionID(): string {
  const cryptoWithUUID = globalThis.crypto as (Crypto & { randomUUID?: () => string }) | undefined
  if (cryptoWithUUID?.randomUUID) {
    return cryptoWithUUID.randomUUID()
  }
  if (!cryptoWithUUID?.getRandomValues) {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
      (Number(c) ^ (Math.floor(Math.random() * 256) & (15 >> (Number(c) / 4)))).toString(16),
    )
  }
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (
      Number(c) ^
      (cryptoWithUUID.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
    ).toString(16),
  )
}
