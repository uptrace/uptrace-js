import fetch from 'cross-fetch'

import { hrTimeToTimeStamp, ExportResult } from '@opentelemetry/core'
import { Attributes, Link, TimedEvent } from '@opentelemetry/api'
import { SpanExporter, ReadableSpan, BatchSpanProcessor } from '@opentelemetry/tracing'

interface ExpoEvent {
  name: string
  attrs: Attributes | undefined
  time: string
}

interface ExpoLink {
  traceId: string
  spanId: string
  attrs: Attributes | undefined
}

interface ExpoTracer {
  name: string
  version: string
}

interface ExpoSpan {
  id: string
  parentId: string

  name: string
  kind: number
  startTime: string
  endTime: string
  attrs: Attributes

  events: ExpoEvent[]
  links: ExpoLink[]
  resource: Attributes

  tracer: ExpoTracer
}

type TraceMap = { [traceId: string]: ExpoSpan[] | undefined }

export interface Config {
  dsn: string
  disabled?: boolean
}

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

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (this._cfg.disabled) {
      resultCallback(ExportResult.SUCCESS)
      return
    }

    const m: TraceMap = {}

    for (const span of spans) {
      const expo = expoSpan(span)

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

  shutdown(): void {}
}

export function batchSpanProcessor(cfg: Config): BatchSpanProcessor {
  return new BatchSpanProcessor(new Exporter(cfg), {
    bufferSize: 10000,
    bufferTimeout: 5 * 1000,
  })
}

function expoSpan(span: ReadableSpan): ExpoSpan {
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
    resource: span.resource.labels,

    tracer: span.instrumentationLibrary,
  } as ExpoSpan

  return expo
}

function expoEvents(events: TimedEvent[]): ExpoEvent[] {
  const expoEvents: ExpoEvent[] = []
  for (const event of events) {
    expoEvents.push({
      name: event.name,
      attrs: event.attributes,
      time: hrTimeToTimeStamp(event.time),
    })
  }
  return expoEvents
}

function expoLinks(links: Link[]): ExpoLink[] {
  const expoLinks: ExpoLink[] = []
  for (const link of links) {
    expoLinks.push({
      traceId: link.context.traceId,
      spanId: link.context.spanId,
      attrs: link.attributes,
    })
  }
  return expoLinks
}
