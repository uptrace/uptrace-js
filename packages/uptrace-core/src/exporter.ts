import fetch from 'cross-fetch'

import { hrTimeToTimeStamp, ExportResult, ExportResultCode } from '@opentelemetry/core'
import { SpanKind, Link, TimedEvent, StatusCode } from '@opentelemetry/api'
import { SpanExporter as ISpanExporter, ReadableSpan } from '@opentelemetry/tracing'

import { EnrichedConfig } from './config'
import type { SpanData, EventData, LinkData } from './types'

export class SpanExporter implements ISpanExporter {
  private _cfg: EnrichedConfig
  private _endpoint = ''
  private _headers: { [key: string]: string } = {}

  constructor(cfg: EnrichedConfig) {
    this._cfg = cfg
    if (this._cfg.disabled) {
      return
    }

    const v = this._cfg._dsn
    this._endpoint = `${v.scheme}//${v.host}/api/v1/tracing/${v.projectId}/spans`
    this._headers = {
      Authorization: 'Bearer ' + this._cfg._dsn.token,
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
      resultCallback({ code: ExportResultCode.SUCCESS })
      return
    }

    const uptraceSpans: SpanData[] = []

    for (const span of spans) {
      const out = uptraceSpan(span)
      if (this._filter(out)) {
        uptraceSpans.push(out)
      }
    }

    fetch(this._endpoint, {
      method: 'POST',
      headers: this._headers,
      body: JSON.stringify({ spans: uptraceSpans }),
    })
      .then((resp: Response) => {
        if (resp.status !== 200) {
          resp.json().then((json) => {
            console.log(json)
          })
        }
      })
      .catch((error) => {
        console.log('uptrace send failed', error)
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

function uptraceSpan(span: ReadableSpan): SpanData {
  const out = {
    id: span.spanContext.spanId,
    traceId: span.spanContext.traceId,

    name: span.name,
    kind: uptraceKind(span.kind),
    startTime: hrTimeToTimeStamp(span.startTime),
    endTime: hrTimeToTimeStamp(span.endTime),

    statusCode: uptraceStatus(span.status.code),
    attrs: span.attributes,

    events: uptraceEvents(span.events),
    links: uptraceLinks(span.links),
    resource: span.resource.attributes,

    tracer: span.instrumentationLibrary,
  } as SpanData

  if (span.parentSpanId) {
    out.parentId = span.parentSpanId
  }
  if (span.status.message) {
    out.statusMessage = span.status.message
  }

  return out
}

function uptraceEvents(events: TimedEvent[]): EventData[] {
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

function uptraceLinks(links: Link[]): LinkData[] {
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

function uptraceKind(kind: SpanKind): string {
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

function uptraceStatus(code: StatusCode): string {
  switch (code) {
    case StatusCode.OK:
      return 'ok'
    case StatusCode.ERROR:
      return 'error'
    default:
      return 'unset'
  }
}
