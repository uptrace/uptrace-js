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
  schema_version: number
  enabled: boolean
  sample_rate: number
  allowed_domains: string[]
  block_selectors: string[]
  mask_selectors: string[]
  mask_all_text: boolean
  cache_ttl_sec: number
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
  protocol_version: 1
  session_id: string
  started_at: string
  chunk_seq: number
  events: unknown[]
  events_window?: {
    first_event_at: string
    last_event_at: string
  }
  url?: string
  page_urls?: string[]
  trace_ids?: string[]
  user?: UserIdentity
  user_ids?: string[]
  user_emails?: string[]
  frontend_error_count?: number
  metadata?: {
    browser?: string
    os?: string
    device?: string
    release?: string
    sdk_version?: string
  }
}
