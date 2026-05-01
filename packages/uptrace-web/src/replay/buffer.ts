import { UserIdentity } from './types'

export interface ReplayEventWindow {
  firstTs: number
  lastTs: number
}

export interface ReplayBufferChunk extends ReplayEventWindow {
  events: unknown[]
  pageURLs: string[]
  traceIDs: string[]
  identity: UserIdentity
  frontendErrorCount: number
}

interface ReplayBufferMetadata {
  identity: UserIdentity
  traceIDs: string[]
  frontendErrorCount: number
}

export class ReplayBuffer {
  private _events: unknown[] = []
  private _pageURLs = new Set<string>()

  constructor(private readonly _targetEventCount: number) {}

  push(event: unknown, pageURL: string): void {
    this._events.push(event)
    this._pageURLs.add(pageURL)
  }

  hasEvents(): boolean {
    return this._events.length > 0
  }

  isFull(): boolean {
    return this._events.length >= this._targetEventCount
  }

  eventWindow(): ReplayEventWindow | undefined {
    if (!this._events.length) {
      return undefined
    }
    return {
      firstTs: eventTimestamp(this._events[0]),
      lastTs: eventTimestamp(this._events[this._events.length - 1]),
    }
  }

  drain(metadata: ReplayBufferMetadata): ReplayBufferChunk | undefined {
    const window = this.eventWindow()
    if (!window) {
      return undefined
    }

    const chunk: ReplayBufferChunk = {
      ...window,
      events: this._events,
      pageURLs: [...this._pageURLs].slice(0, 100),
      traceIDs: [...metadata.traceIDs].slice(0, 100),
      identity: {...metadata.identity},
      frontendErrorCount: metadata.frontendErrorCount,
    }
    this._events = []
    this._pageURLs.clear()
    return chunk
  }

  restore(chunk: ReplayBufferChunk): void {
    this._events = [...chunk.events, ...this._events]
    const pageURLs = new Set(chunk.pageURLs)
    for (const pageURL of this._pageURLs) {
      pageURLs.add(pageURL)
    }
    this._pageURLs = pageURLs
  }
}

function eventTimestamp(event: unknown): number {
  const timestamp = (event as {timestamp?: unknown})?.timestamp
  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
    return timestamp
  }
  return Date.now()
}
