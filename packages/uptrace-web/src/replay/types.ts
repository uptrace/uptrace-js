export interface UserIdentity {
  id?: string
  email?: string
}

export interface SessionReplaySamplingConfig {
  mousemoveMs?: number | false
  mousemoveCallbackMs?: number
}

export interface SessionReplayConfig {
  enabled?: boolean
  sampleRate?: number
  allowedDomains?: string[]
  blockSelectors?: string[]
  maskSelectors?: string[]
  maskAllText?: boolean
  recordIframes?: boolean
  sampling?: SessionReplaySamplingConfig
  sessionTimeoutMs?: number
  maxSessionAgeMs?: number
  getTraceId?: () => string | undefined
}

export interface RemoteReplayPolicy {
  schemaVersion: number
  enabled: boolean
  sampleRate: number
  allowedDomains: string[]
  blockSelectors: string[]
  maskSelectors: string[]
  maskAllText: boolean
  cacheTtlSec: number
}

export interface EffectiveReplayConfig {
  enabled: boolean
  sampleRate: number
  allowedDomains: string[]
  blockSelectors: string[]
  maskSelectors: string[]
  maskAllText: boolean
  recordIframes: boolean
  sampling: Required<SessionReplaySamplingConfig>
  sessionTimeoutMs: number
  maxSessionAgeMs: number
  getTraceId?: () => string | undefined
}

export interface TraceWindow {
  traceId: string
  startTs: number
  endTs: number
  error: boolean
}

export interface ReplayChunkEnvelope {
  protocolVersion: 1
  sessionId: string
  startedAt: string
  chunkSeq: number
  events: unknown[]
  eventsWindow?: {
    firstEventAt: string
    lastEventAt: string
  }
  url?: string
  pageUrls?: string[]
  traceIds?: string[]
  user?: UserIdentity
  userIds?: string[]
  userEmails?: string[]
  frontendErrorCount?: number
  metadata?: {
    browser?: string
    os?: string
    device?: string
    release?: string
    sdkVersion?: string
  }
}
