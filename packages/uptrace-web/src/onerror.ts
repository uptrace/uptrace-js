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

    if (err) {
      span.addEvent('exception', {
        'exception.type': err.name,
        'exception.message': err.message,
        'exception.stacktrace': err.stack,
        onerror: true,
      })
    } else if (message) {
      const attrs: Attributes = {
        'exception.message': message,
        onerror: true,
      }
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
