import { Span, SpanAttributes, ContextManager, TextMapPropagator } from '@opentelemetry/api'
import { BatchSpanProcessor, TracerConfig } from '@opentelemetry/tracing'
import { WebTracerProvider } from '@opentelemetry/web'

import {
  createClient,
  createResource,
  parseDSN,
  DSN,
  Config as BaseConfig,
  SpanExporter,
} from '@uptrace/core'

const hasWindow = typeof window !== undefined

let _CLIENT = createClient(parseDSN('https://<key>@api.uptrace.dev/<project_id>'))

export function traceUrl(span: Span): string {
  return _CLIENT.traceUrl(span)
}

export function reportException(err: Error | string, attrs: SpanAttributes = {}) {
  _CLIENT.reportException(err, attrs)
}

//------------------------------------------------------------------------------

export interface Config extends BaseConfig, TracerConfig {
  contextManager: ContextManager
  textMapPropagator: TextMapPropagator
}

export function configureOpentelemetry(cfg: Config) {
  configureResource(cfg)
  configureTracing(cfg)

  if (hasWindow) {
    setupOnError()
  }
}

function configureResource(cfg: Config) {
  cfg.resource = createResource(
    cfg.resource,
    cfg.resourceAttributes,
    cfg.serviceName ?? '',
    cfg.serviceVersion ?? '',
  )
}

function configureTracing(cfg: Config) {
  if (!cfg.dsn && hasWindow && (window as any).UPTRACE_DSN) {
    cfg.dsn = (window as any).UPTRACE_DSN
  }

  let dsn: DSN

  try {
    dsn = parseDSN(cfg.dsn)
  } catch (err) {
    console.error('Uptrace is disabled:', err.message ?? err)
    return
  }

  _CLIENT = createClient(dsn)

  if (hasWindow) {
    const savedHook = cfg.onBeforeSend

    cfg.onBeforeSend = (span) => {
      if (savedHook) {
        savedHook(span)
      }

      if (window.navigator && window.navigator.userAgent) {
        span.attrs['http.user_agent'] = String(window.navigator.userAgent)
      }
      if (window.location) {
        span.attrs['http.url'] = String(window.location)
      }
    }
  }

  const exporter = new SpanExporter(dsn)
  const spanProcessor = new BatchSpanProcessor(exporter, {
    maxExportBatchSize: 1000,
    maxQueueSize: 1000,
    scheduledDelayMillis: 5 * 1000,
  })

  const provider = new WebTracerProvider({
    sampler: cfg.sampler,
    traceParams: cfg.traceParams,
    resource: cfg.resource,
    idGenerator: cfg.idGenerator,
  })
  provider.addSpanProcessor(spanProcessor)
  provider.register({
    contextManager: cfg.contextManager,
    propagator: cfg.textMapPropagator,
  })
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

    const attrs: SpanAttributes = {
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
