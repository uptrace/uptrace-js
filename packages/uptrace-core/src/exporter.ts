import fetch from 'cross-fetch'

import { hrTimeToTimeStamp, ExportResult, ExportResultCode } from '@opentelemetry/core'
import { SpanKind, Link, SpanStatusCode } from '@opentelemetry/api'
import { SpanExporter as ISpanExporter, ReadableSpan, TimedEvent } from '@opentelemetry/tracing'

import { parseDSN } from './config'
import type { SpanData, EventData, LinkData } from './types'

export interface SpanExporterConfig {
  dsn: string
  beforeSpanSend: (span: SpanData) => void
}

export class SpanExporter implements ISpanExporter {
  private _cfg: SpanExporterConfig
  private _endpoint = ''
  private _headers: { [key: string]: string } = {}

  constructor(cfg: SpanExporterConfig) {
    this._cfg = cfg

    const dsn = parseDSN(cfg.dsn)
    this._endpoint = `${dsn.scheme}//${dsn.host}/api/v1/tracing/${dsn.projectId}/spans`
    this._headers = {
      Authorization: 'Bearer ' + dsn.token,
      'Content-Type': 'application/json',
    }
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const outSpans: SpanData[] = []

    for (const span of spans) {
      const outSpan = _span(span)
      this._cfg.beforeSpanSend(outSpan)
      outSpans.push(outSpan)
    }

    const body = JSON.stringify({ spans: outSpans })

    fetch(this._endpoint, {
      method: 'POST',
      headers: this._headers,
      body,
    })
      .then((resp: Response) => {
        if (resp.status !== 200) {
          resp.json().then((json) => {
            console.error('uptrace send failed', json.message)
          })
        }
      })
      .catch((error) => {
        console.error('uptrace send failed', error)
      })
      .finally(() => {
        resultCallback({ code: ExportResultCode.SUCCESS })
      })
  }

  shutdown(): Promise<void> {
    return new Promise((resolve) => {
      resolve()
    })
  }
}

function _span(span: ReadableSpan): SpanData {
  const spanCtx = span.spanContext()
  const out: SpanData = {
    id: spanCtx.spanId,
    traceId: spanCtx.traceId,

    name: span.name,
    kind: _kind(span.kind),
    startTime: hrTimeToTimeStamp(span.startTime),
    endTime: hrTimeToTimeStamp(span.endTime),

    resource: span.resource.attributes,
    attrs: span.attributes,

    statusCode: _status(span.status.code),
    tracerName: span.instrumentationLibrary.name,
  }

  if (span.parentSpanId) {
    out.parentId = span.parentSpanId
  }
  if (span.status.message) {
    out.statusMessage = span.status.message
  }
  if (span.instrumentationLibrary.version) {
    out.tracerVersion = span.instrumentationLibrary.version
  }

  if (span.events.length) {
    out.events = _events(span.events)
  }
  if (span.links.length) {
    out.links = _links(span.links)
  }

  return out as SpanData
}

function _events(events: TimedEvent[]): EventData[] {
  const uptraceEvents: EventData[] = []
  for (const event of events) {
    uptraceEvents.push({
      name: event.name,
      attrs: event.attributes,
      time: hrTimeToTimeStamp(event.time),
    })
  }
  return uptraceEvents
}

function _links(links: Link[]): LinkData[] {
  const uptraceLinks: LinkData[] = []
  for (const link of links) {
    uptraceLinks.push({
      traceId: link.context.traceId,
      spanId: link.context.spanId,
      attrs: link.attributes,
    })
  }
  return uptraceLinks
}

function _kind(kind: SpanKind): string {
  switch (kind) {
    case SpanKind.SERVER:
      return 'server'
    case SpanKind.CLIENT:
      return 'client'
    case SpanKind.PRODUCER:
      return 'producer'
    case SpanKind.CONSUMER:
      return 'producer'
    default:
      return 'internal'
  }
}

function _status(code: SpanStatusCode): string {
  switch (code) {
    case SpanStatusCode.OK:
      return 'ok'
    case SpanStatusCode.ERROR:
      return 'error'
    default:
      return 'unset'
  }
}
