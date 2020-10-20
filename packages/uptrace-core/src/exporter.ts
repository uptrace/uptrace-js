import fetch from 'cross-fetch'

import { hrTimeToTimeStamp, ExportResult } from '@opentelemetry/core'
import { Link, TimedEvent } from '@opentelemetry/api'
import { SpanExporter, ReadableSpan } from '@opentelemetry/tracing'

import { Config } from './config'
import type { SpanData, EventData, LinkData } from './types'

type TraceMap = { [traceId: string]: SpanData[] | undefined }

export class Exporter implements SpanExporter {
  private _cfg: Config
  private _endpoint: string
  private _headers: { [key: string]: string }

  constructor(cfg: Config) {
    this._cfg = cfg

    if (!cfg.dsn) {
      throw new Error('uptrace: dsn is required')
    }

    let u: URL | undefined

    try {
      u = new URL(cfg.dsn)
    } catch (err) {
      throw new Error(`uptrace: can't parse dsn: ${err.message}`)
    }

    this._endpoint = `${u.protocol}//${u.host}/api/v1/tracing${u.pathname}/spans`
    this._headers = {
      Authorization: 'Bearer ' + u.username,
      'Content-Type': 'application/json',
    }
  }

  private _filter(span: SpanData): boolean {
    if (!this._cfg.filters) {
      return true
    }

    for (let fn of this._cfg.filters) {
      if (!fn(span)) {
        return false
      }
    }
    return true
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (this._cfg.disabled) {
      resultCallback(ExportResult.SUCCESS)
      return
    }

    const m: TraceMap = {}

    for (const span of spans) {
      const expo = expoSpan(span)

      if (!this._filter(expo)) {
        continue
      }

      const traceId = span.spanContext.traceId
      let expoSpans = m[traceId]
      if (!expoSpans) {
        expoSpans = []
        m[traceId] = expoSpans
      }
      expoSpans.push(expo)
    }

    const traces = []

    for (const traceId in m) {
      traces.push({
        id: traceId,
        spans: m[traceId],
      })
    }

    fetch(this._endpoint, {
      method: 'POST',
      headers: this._headers,
      body: JSON.stringify({ traces }),
    })
      .then(() => {
        // resp: Response
      })
      .finally(() => {
        resultCallback(ExportResult.SUCCESS)
      })
  }

  shutdown(): Promise<void> {
    return new Promise((resolve) => {
      resolve()
    })
  }
}

function expoSpan(span: ReadableSpan): SpanData {
  const expo = {
    id: span.spanContext.spanId,
    parentId: span.parentSpanId,

    name: span.name,
    kind: span.kind,
    startTime: hrTimeToTimeStamp(span.startTime),
    endTime: hrTimeToTimeStamp(span.endTime),
    attrs: span.attributes,

    events: expoEvents(span.events),
    links: expoLinks(span.links),
    resource: span.resource.attributes,

    tracer: span.instrumentationLibrary,
  } as SpanData

  return expo
}

function expoEvents(events: TimedEvent[]): EventData[] {
  const expoEvents: EventData[] = []
  for (const event of events) {
    expoEvents.push({
      name: event.name,
      attrs: event.attributes,
      time: hrTimeToTimeStamp(event.time),
    })
  }
  return expoEvents
}

function expoLinks(links: Link[]): LinkData[] {
  const expoLinks: LinkData[] = []
  for (const link of links) {
    expoLinks.push({
      traceId: link.context.traceId,
      spanId: link.context.spanId,
      attrs: link.attributes,
    })
  }
  return expoLinks
}
