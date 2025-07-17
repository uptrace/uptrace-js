import { Span, Attributes } from '@opentelemetry/api'
import { registerInstrumentations } from '@opentelemetry/instrumentation'

import { createClient, createResource, parseDsn, Dsn } from '@uptrace/core'
import { initConfig, Config } from './config'
import { configureTracing } from './tracing'
import { browserAttributes, entryPageAttributes } from './resources'

const hasWindow = typeof window !== 'undefined'

let _CLIENT = createClient(parseDsn('https://<key>@uptrace.dev/<project_id>'))

export function reportException(err: Error | string, attrs: Attributes = {}) {
  _CLIENT.reportException(err, attrs)
}

export function traceUrl(span: Span): string {
  return _CLIENT.traceUrl(span)
}

//------------------------------------------------------------------------------

export function configureOpentelemetry(conf: Config) {
  if (!conf.dsn && hasWindow && (window as any).UPTRACE_DSN) {
    conf.dsn = (window as any).UPTRACE_DSN
  }

  let dsn: Dsn

  try {
    dsn = parseDsn(conf.dsn)
  } catch (err) {
    console.error('Uptrace is disabled:', String(err))
    return
  }

  _CLIENT = createClient(dsn)

  initConfig(conf)

  if (conf.instrumentations) {
    registerInstrumentations({
      instrumentations: conf.instrumentations,
    })
  }

  configureResource(conf)
  configureTracing(conf, dsn)

  if (hasWindow) {
    setupOnError()
  }
}

function configureResource(conf: Config) {
  conf.resourceAttributes = {
    ...browserAttributes(),
    ...conf.resourceAttributes,
  }
  if (conf.entryPage) {
    Object.assign(conf.resourceAttributes, entryPageAttributes(conf.entryPage))
  }
  conf.resource = createResource(conf)
}

function setupOnError(): void {
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

    if (err) {
      reportException(err, { onerror: true })
      return
    }

    if (message === 'Script error.') {
      return
    }

    const attrs: Attributes = {
      'window.onerror': true,
    }
    if (file) {
      attrs['code.filepath'] = file
    }
    if (line) {
      attrs['code.lineno'] = line
    }
    if (column) {
      attrs['code.colno'] = column
    }
    reportException(String(message), attrs)
  }
}

export function shutdown(): Promise<void> {
  // TODO: provide shutdown
  return Promise.resolve()
}
