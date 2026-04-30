import { Dsn } from '@uptrace/core'
import { VERSION } from '../version'
import { replayIdentity } from './identity'
import { domainAllowed, effectiveReplayConfig, fetchReplayPolicy } from './remote_config'
import { SessionReplaySpanProcessor } from './span_processor'
import { EffectiveReplayConfig, ReplayChunkEnvelope, SessionReplayConfig } from './types'

const FLUSH_INTERVAL_MS = 5000
const TARGET_EVENT_COUNT = 1000
const KEEPALIVE_LIMIT_BYTES = 52 * 1024
const SESSION_STORAGE_PREFIX = 'uptrace:replay:'

let activeController: SessionReplayController | undefined

export function startReplay(
  localConfig: SessionReplayConfig | undefined,
  dsn: Dsn,
  dsnHeader: string,
  spanProcessor: SessionReplaySpanProcessor,
): void {
  if (!localConfig) {
    return
  }
  activeController = new SessionReplayController(localConfig, dsn, dsnHeader, spanProcessor)
  activeController.start()
}

export function flushReplay(): Promise<void> {
  return activeController?.flush() ?? Promise.resolve()
}

export function stopReplay(): void {
  activeController?.stop()
  activeController = undefined
}

class SessionReplayController {
  private _effective?: EffectiveReplayConfig
  private _events: unknown[] = []
  private _pageURLs = new Set<string>()
  private _sessionID = ''
  private _startedAt = 0
  private _chunkSeq = 0
  private _flushTimer?: ReturnType<typeof setInterval>
  private _stopRecorder?: () => void
  private _started = false

  constructor(
    private readonly _localConfig: SessionReplayConfig,
    private readonly _dsn: Dsn,
    private readonly _dsnHeader: string,
    private readonly _spanProcessor: SessionReplaySpanProcessor,
  ) {}

  start(): void {
    if (this._started) {
      return
    }
    this._started = true
    void this.startAsync()
  }

  stop(): void {
    if (this._flushTimer) {
      clearInterval(this._flushTimer)
      this._flushTimer = undefined
    }
    if (this._stopRecorder) {
      this._stopRecorder()
      this._stopRecorder = undefined
    }
    void this.flush()
  }

  async flush(keepalive = false): Promise<void> {
    if (!this._events.length || !this._effective) {
      return
    }

    const events = this._events
    this._events = []

    const firstTs = eventTimestamp(events[0])
    const lastTs = eventTimestamp(events[events.length - 1])
    const identity = replayIdentity()
    const traceIDs = new Set(this._spanProcessor.traceIDsForWindow(firstTs, lastTs))
    const fallbackTraceID = this._effective.getTraceId?.()
    if (fallbackTraceID) {
      traceIDs.add(fallbackTraceID)
    }

    const envelope: ReplayChunkEnvelope = {
      protocol_version: 1,
      session_id: this._sessionID,
      started_at: new Date(this._startedAt).toISOString(),
      chunk_seq: this._chunkSeq++,
      events,
      events_window: {
        first_event_at: new Date(firstTs).toISOString(),
        last_event_at: new Date(lastTs).toISOString(),
      },
      url: location.href,
      page_urls: [...this._pageURLs].slice(0, 100),
      trace_ids: [...traceIDs].slice(0, 100),
      user: identity,
      user_ids: identity.id ? [identity.id] : [],
      user_emails: identity.email ? [identity.email] : [],
      frontend_error_count: this._spanProcessor.errorCountForWindow(firstTs, lastTs),
      metadata: {
        browser: browserName(),
        os: navigator.platform,
        sdk_version: VERSION,
      },
    }
    this._pageURLs.clear()

    const body = JSON.stringify(envelope)
    if (keepalive && body.length > KEEPALIVE_LIMIT_BYTES) {
      this._events.unshift(...events)
      return
    }

    const resp = await fetch(`${this._dsn.otlpHttpEndpoint()}/api/v1/session-replays`, {
      method: 'POST',
      credentials: 'omit',
      keepalive,
      headers: {
        'content-type': 'application/json',
        'uptrace-dsn': this._dsnHeader,
      },
      body,
    })
    if (!resp.ok && resp.status >= 500 && !keepalive) {
      await fetch(`${this._dsn.otlpHttpEndpoint()}/api/v1/session-replays`, {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'content-type': 'application/json',
          'uptrace-dsn': this._dsnHeader,
        },
        body,
      })
    }
  }

  private async startAsync(): Promise<void> {
    let remotePolicy
    try {
      remotePolicy = await fetchReplayPolicy(this._dsn, this._dsnHeader)
    } catch {
      return
    }

    const effective = effectiveReplayConfig(this._localConfig, remotePolicy)
    if (!effective.enabled || !domainAllowed(effective.allowedDomains, location.hostname)) {
      return
    }
    if (Math.random() > effective.sampleRate) {
      return
    }
    this._effective = effective
    this.restoreSession(effective)

    const rrweb = await import('rrweb')
    this._stopRecorder = rrweb.record({
      emit: (event: unknown) => {
        this.pushEvent(event)
      },
      checkoutEveryNms: 5 * 60 * 1000,
      checkoutEveryNth: 50,
      maskAllInputs: true,
      blockSelector: effective.blockSelectors.join(','),
      maskTextSelector: effective.maskSelectors.join(','),
      maskTextFn: maskReplayText,
      recordCanvas: false,
      inlineImages: false,
      collectFonts: false,
      plugins: [],
      recordCrossOriginIframes: false,
      keepIframeSrcFn: () => false,
      sampling: samplingOptions(effective),
    } as any) as () => void

    rrweb.addCustomEvent('uptrace_url_change', {url: location.href})
    this._flushTimer = setInterval(() => {
      void this.flush()
    }, FLUSH_INTERVAL_MS)
    window.addEventListener('pagehide', () => {
      void this.flush(true)
    })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void this.flush(true)
      }
    })
  }

  private pushEvent(event: unknown): void {
    this._events.push(event)
    this._pageURLs.add(location.href)
    this.saveSession()
    if (this._events.length >= TARGET_EVENT_COUNT) {
      void this.flush()
    }
  }

  private restoreSession(effective: EffectiveReplayConfig): void {
    const key = this.storageKey()
    const now = Date.now()
    const saved = parseSavedSession(localStorage.getItem(key))
    if (
      saved &&
      now - saved.lastSeenAt <= effective.sessionTimeoutMs &&
      now - saved.startedAt <= effective.maxSessionAgeMs
    ) {
      this._sessionID = saved.sessionID
      this._startedAt = saved.startedAt
      this._chunkSeq = saved.chunkSeq
      this.saveSession()
      return
    }

    this._sessionID = newSessionID()
    this._startedAt = now
    this._chunkSeq = 0
    this.saveSession()
  }

  private saveSession(): void {
    try {
      localStorage.setItem(
        this.storageKey(),
        JSON.stringify({
          sessionID: this._sessionID,
          startedAt: this._startedAt,
          chunkSeq: this._chunkSeq,
          lastSeenAt: Date.now(),
        }),
      )
    } catch {}
  }

  private storageKey(): string {
    return `${SESSION_STORAGE_PREFIX}${this._dsn.toString()}`
  }
}

function parseSavedSession(value: string | null):
  | {
      sessionID: string
      startedAt: number
      chunkSeq: number
      lastSeenAt: number
    }
  | undefined {
  if (!value) {
    return undefined
  }
  try {
    const parsed = JSON.parse(value)
    if (parsed.sessionID && parsed.startedAt && parsed.lastSeenAt) {
      return parsed
    }
  } catch {}
  return undefined
}

function newSessionID(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16),
  )
}

function eventTimestamp(event: unknown): number {
  const timestamp = (event as {timestamp?: unknown})?.timestamp
  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
    return timestamp
  }
  return Date.now()
}

function samplingOptions(effective: EffectiveReplayConfig): Record<string, unknown> {
  if (effective.sampling.mousemoveMs === false) {
    return {mousemove: false}
  }
  return {
    mousemove: effective.sampling.mousemoveMs,
    mousemoveCallback: effective.sampling.mousemoveCallbackMs,
  }
}

function maskReplayText(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, maskToken)
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, maskToken)
    .replace(/[^\s]/g, '*')
}

function maskToken(value: string): string {
  return value.replace(/[^\s]/g, '*')
}

function browserName(): string {
  const ua = navigator.userAgent
  if (ua.includes('Firefox/')) {
    return 'firefox'
  }
  if (ua.includes('Edg/')) {
    return 'edge'
  }
  if (ua.includes('Chrome/')) {
    return 'chrome'
  }
  if (ua.includes('Safari/')) {
    return 'safari'
  }
  return ''
}
