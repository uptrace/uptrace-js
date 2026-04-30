import { Context, SpanStatusCode } from '@opentelemetry/api'
import { hrTimeToMilliseconds } from '@opentelemetry/core'
import { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base'
import { applyIdentityAttributes } from './identity'
import { TraceWindow } from './types'

const MAX_TRACE_WINDOWS = 200

export class SessionReplaySpanProcessor implements SpanProcessor {
  private _windows: TraceWindow[] = []

  forceFlush(): Promise<void> {
    return Promise.resolve()
  }

  onStart(span: Span, _parentContext: Context): void {
    applyIdentityAttributes(span)
  }

  onEnd(span: ReadableSpan): void {
    const traceId = span.spanContext().traceId
    if (!traceId) {
      return
    }

    this._windows.push({
      traceId,
      startTs: hrTimeToMilliseconds(span.startTime),
      endTs: hrTimeToMilliseconds(span.endTime),
      error:
        span.status.code === SpanStatusCode.ERROR ||
        span.events.some((event) => event.name === 'exception'),
    })
    if (this._windows.length > MAX_TRACE_WINDOWS) {
      this._windows.splice(0, this._windows.length - MAX_TRACE_WINDOWS)
    }
  }

  shutdown(): Promise<void> {
    this._windows = []
    return Promise.resolve()
  }

  traceIDsForWindow(firstTs: number, lastTs: number): string[] {
    const traceIds = new Set<string>()
    for (const item of this._windows) {
      if (item.endTs >= firstTs && item.startTs <= lastTs) {
        traceIds.add(item.traceId)
      }
    }
    return [...traceIds].slice(0, 100)
  }

  errorCountForWindow(firstTs: number, lastTs: number): number {
    let count = 0
    for (const item of this._windows) {
      if (item.error && item.endTs >= firstTs && item.startTs <= lastTs) {
        count++
      }
    }
    return Math.min(count, 5000)
  }
}
