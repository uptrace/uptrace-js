import { trace, context, Tracer, Span, SpanAttributes } from '@opentelemetry/api'

import { Dsn } from './config'

const DUMMY_SPAN_NAME = '__dummy__'

export class Client {
  private _dsn: Dsn
  private _tracer?: Tracer

  constructor(dsn: Dsn) {
    this._dsn = dsn
  }

  traceUrl(span: Span): string {
    const ctx = span.spanContext()
    const traceId = ctx?.traceId ?? '<no trace>'
    const spanId = ctx?.spanId ?? '<no span>'
    return `${this._dsn.siteUrl()}/traces/${traceId}?span_id=${spanId}`
  }

  // reportException reports an exception as a span event creating a dummy span if necessary.
  public reportException(err: Error | string, attrs: SpanAttributes = {}) {
    let startedSpan = false

    const tracer = this._internalTracer()
    let span = trace.getSpan(context.active())

    if (!span) {
      span = tracer.startSpan(DUMMY_SPAN_NAME)
      startedSpan = true
    }

    if (typeof err === 'string') {
      attrs['exception.message'] = err
    } else {
      attrs['exception.type'] = err.name
      attrs['exception.message'] = err.message
      attrs['exception.stacktrace'] = err.stack
    }

    span.addEvent('exception', attrs)

    if (startedSpan) {
      span.end()
    }
  }

  private _internalTracer(): Tracer {
    if (!this._tracer) {
      this._tracer = trace.getTracer('uptrace-js')
    }
    return this._tracer
  }
}

export function createClient(dsn: Dsn): Client {
  return new Client(dsn)
}
