import { trace, getSpan, context, Tracer, Span, SpanAttributes } from '@opentelemetry/api'

import { DSN } from './config'

const DUMMY_SPAN_NAME = '__dummy__'

export class Client {
  private _dsn: DSN
  private _tracer?: Tracer

  constructor(dsn: DSN) {
    this._dsn = dsn
  }

  // reportException reports an exception as a span event creating a dummy span if necessary.
  public reportException(err: Error | string, attrs: SpanAttributes = {}) {
    let startedSpan = false

    const tracer = this._internalTracer()
    let span = getSpan(context.active())

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

  public traceUrl(span: Span): string {
    const dsn = this._dsn
    const host = dsn.host.slice(4)
    const traceId = span.context().traceId
    return `${dsn.scheme}//${host}/search/${dsn.projectId}?q=${traceId}`
  }

  private _internalTracer(): Tracer {
    if (!this._tracer) {
      this._tracer = trace.getTracer('uptrace-js')
    }
    return this._tracer
  }
}

export function createClient(dsn: DSN): Client {
  return new Client(dsn)
}
