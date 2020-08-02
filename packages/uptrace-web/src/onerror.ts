import { Attributes } from '@opentelemetry/api'
import { Tracer } from '@opentelemetry/tracing'

const DUMMY_SPAN_NAME = '__dummy__'

export function setupOnError(tracer: Tracer): void {
  const oldHandler = window.onerror

  window.onerror = function uptraceOnerrorHandler(
    message: string | Event,
    file?: string,
    line?: number,
    column?: number,
    err?: Error,
  ) {
    if (oldHandler) {
      oldHandler(message, file, line, column, err)
    }

    let startedSpan = false

    let span = tracer.getCurrentSpan()
    if (!span) {
      span = tracer.startSpan(DUMMY_SPAN_NAME)
      startedSpan = true
    }

    const attrs: Attributes = {
      onerror: true,
    }

    if (window.navigator && window.navigator.userAgent) {
      attrs['http.user_agent'] = String(window.navigator.userAgent)
    }

    if (window.location) {
      attrs['http.url'] = String(window.location)
    }

    if (err) {
      attrs['exception.type'] = err.name
      attrs['exception.message'] = err.message
      attrs['exception.stacktrace'] = err.stack

      span.addEvent('exception', attrs)
    } else if (message) {
      attrs['exception.message'] = message
      if (file) {
        attrs['frame.file'] = file
      }
      if (line) {
        attrs['frame.line'] = line
      }
      if (column) {
        attrs['frame.column'] = column
      }
      span.addEvent('exception', attrs)
    }

    if (startedSpan) {
      span.end()
    }
  }
}
