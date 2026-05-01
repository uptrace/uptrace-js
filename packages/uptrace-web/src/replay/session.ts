import { Dsn } from '@uptrace/core'
import { replayIdentity } from './identity'
import { domainAllowed, effectiveReplayConfig, fetchReplayPolicy } from './remote_config'
import { ReplayBuffer } from './buffer'
import { SessionReplayRecorder } from './recorder'
import { SessionReplaySpanProcessor } from './span_processor'
import { EffectiveReplayConfig, SessionReplayConfig } from './types'
import { SessionReplayUploader } from './uploader'

const FLUSH_INTERVAL_MS = 5000
const TARGET_EVENT_COUNT = 1000
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
    const window = this._buffer.eventWindow()
    if (!window || !effective) {
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
    this.restoreSession(effective)

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
    this._buffer.push(event, location.href)
    this.saveSession()
    if (this._buffer.isFull()) {
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
