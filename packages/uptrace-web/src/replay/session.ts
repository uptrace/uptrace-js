import { Dsn } from '@uptrace/core'
import { SessionProvider } from '@opentelemetry/web-common'
import { replayIdentity } from './identity'
import { domainAllowed, effectiveReplayConfig, fetchReplayPolicy } from './remote_config'
import { ReplayBuffer } from './buffer'
import { SessionReplayRecorder } from './recorder'
import { SessionReplaySpanProcessor } from './span_processor'
import { EffectiveReplayConfig, SessionReplayConfig } from './types'
import { SessionReplayUploader } from './uploader'
import { BrowserSession, BrowserSessionProvider, isUUID } from '../session_provider'

const FLUSH_INTERVAL_MS = 5000
const TARGET_EVENT_COUNT = 1000
const SESSION_STORAGE_PREFIX = 'uptrace:replay:'

let activeController: SessionReplayController | undefined

export function startReplay(
  localConfig: SessionReplayConfig | undefined,
  dsn: Dsn,
  dsnHeader: string,
  spanProcessor: SessionReplaySpanProcessor,
  sessionProvider: SessionProvider | undefined,
  fallbackSessionProvider: BrowserSessionProvider,
): void {
  if (!localConfig) {
    return
  }
  activeController = new SessionReplayController(
    localConfig,
    dsn,
    dsnHeader,
    spanProcessor,
    sessionProvider,
    fallbackSessionProvider,
  )
  activeController.start()
}

export function flushReplay(): Promise<void> {
  return activeController?.flush() ?? Promise.resolve()
}

export function stopReplay(): void {
  void shutdownReplay()
}

export function shutdownReplay(): Promise<void> {
  const controller = activeController
  activeController = undefined
  return controller?.stop() ?? Promise.resolve()
}

class SessionReplayController {
  private _effective?: EffectiveReplayConfig
  private _buffer = new ReplayBuffer(TARGET_EVENT_COUNT)
  private _sessionID = ''
  private _startedAt = 0
  private _chunkSeq = 0
  private _flushTimer?: ReturnType<typeof setInterval>
  private _recorder?: SessionReplayRecorder
  private _uploader: SessionReplayUploader
  private _flushing?: Promise<void>
  private _started = false

  constructor(
    private readonly _localConfig: SessionReplayConfig,
    private readonly _dsn: Dsn,
    private readonly _dsnHeader: string,
    private readonly _spanProcessor: SessionReplaySpanProcessor,
    private readonly _sessionProvider: SessionProvider | undefined,
    private readonly _fallbackSessionProvider: BrowserSessionProvider,
  ) {
    this._uploader = new SessionReplayUploader(_dsn, _dsnHeader)
  }

  start(): void {
    if (this._started) {
      return
    }
    this._started = true
    void this.startAsync()
  }

  stop(): Promise<void> {
    if (this._flushTimer) {
      clearInterval(this._flushTimer)
      this._flushTimer = undefined
    }
    if (this._recorder) {
      this._recorder.stop()
      this._recorder = undefined
    }
    return this.flush()
  }

  async flush(keepalive = false): Promise<void> {
    if (this._flushing) {
      return this._flushing
    }

    this._flushing = this.flushOnce(keepalive).finally(() => {
      this._flushing = undefined
    })
    return this._flushing
  }

  private async flushOnce(keepalive: boolean): Promise<void> {
    const effective = this._effective
    if (!effective) {
      return
    }
    this.syncSession()
    const window = this._buffer.eventWindow()
    if (!window) {
      return
    }

    const traceIDs = new Set(this._spanProcessor.traceIDsForWindow(window.firstTs, window.lastTs))
    const fallbackTraceID = effective.getTraceId?.()
    if (fallbackTraceID) {
      traceIDs.add(fallbackTraceID)
    }

    const chunk = this._buffer.drain({
      identity: replayIdentity(),
      traceIDs: [...traceIDs],
      frontendErrorCount: this._spanProcessor.errorCountForWindow(window.firstTs, window.lastTs),
    })
    if (!chunk) {
      return
    }

    let uploaded = false
    try {
      uploaded = await this._uploader.upload(
        {
          sessionID: this._sessionID,
          startedAt: this._startedAt,
          chunkSeq: this._chunkSeq,
          chunk,
        },
        keepalive,
      )
    } catch {
      uploaded = false
    }

    if (!uploaded) {
      this._buffer.restore(chunk)
      return
    }

    this._chunkSeq++
    this.saveSession()
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
    this.restoreSession()

    this._recorder = new SessionReplayRecorder(effective, (event: unknown) => {
      this.pushEvent(event)
    })
    try {
      const recording = await this._recorder.start()
      if (!recording) {
        this._recorder = undefined
        return
      }
    } catch {
      this._recorder = undefined
      return
    }

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
    this.syncSession()
    this._buffer.push(event, location.href)
    this.saveSession()
    if (this._buffer.isFull()) {
      void this.flush()
    }
  }

  private restoreSession(): void {
    this.syncSession(parseSavedSession(this.storageKey()))
  }

  private syncSession(saved = parseSavedSession(this.storageKey())): void {
    const browserSession = resolveReplayBrowserSession(
      this._sessionProvider,
      this._fallbackSessionProvider,
      saved,
    )
    const state = resolveReplaySessionState(
      browserSession,
      saved,
      this._sessionID
        ? {
            sessionID: this._sessionID,
            startedAt: this._startedAt,
            chunkSeq: this._chunkSeq,
          }
        : undefined,
    )
    this._sessionID = state.sessionID
    this._startedAt = state.startedAt
    this._chunkSeq = state.chunkSeq
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

function parseSavedSession(storageKey: string):
  | {
      sessionID: string
      startedAt: number
      chunkSeq: number
      lastSeenAt: number
    }
  | undefined {
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
      typeof parsed.sessionID === 'string' &&
      isUUID(parsed.sessionID) &&
      typeof parsed.startedAt === 'number' &&
      Number.isFinite(parsed.startedAt) &&
      typeof parsed.chunkSeq === 'number' &&
      Number.isFinite(parsed.chunkSeq) &&
      parsed.chunkSeq >= 0 &&
      typeof parsed.lastSeenAt === 'number' &&
      Number.isFinite(parsed.lastSeenAt)
    ) {
      return parsed
    }
  } catch {}
  return undefined
}

export function resolveReplayBrowserSession(
  sessionProvider: SessionProvider | undefined,
  fallbackSessionProvider: BrowserSessionProvider,
  saved?: {sessionID: string; startedAt: number},
): BrowserSession {
  if (sessionProvider instanceof BrowserSessionProvider) {
    return sessionProvider.getSession()
  }

  const sessionID = sessionProvider?.getSessionId()
  if (sessionID && isUUID(sessionID)) {
    return {
      id: sessionID,
      startedAt: saved?.sessionID === sessionID ? saved.startedAt : Date.now(),
      lastSeenAt: Date.now(),
    }
  }

  return fallbackSessionProvider.getSession()
}

export function resolveReplaySessionState(
  browserSession: BrowserSession,
  saved?: {sessionID: string; startedAt: number; chunkSeq: number},
  current?: {sessionID: string; startedAt: number; chunkSeq: number},
): {sessionID: string; startedAt: number; chunkSeq: number} {
  if (current?.sessionID === browserSession.id) {
    return {
      sessionID: browserSession.id,
      startedAt: browserSession.startedAt,
      chunkSeq: current.chunkSeq,
    }
  }

  return {
    sessionID: browserSession.id,
    startedAt: browserSession.startedAt,
    chunkSeq: saved?.sessionID === browserSession.id ? saved.chunkSeq : 0,
  }
}
