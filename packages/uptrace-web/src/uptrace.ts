import { Span, SpanAttributes, ContextManager, TextMapPropagator } from '@opentelemetry/api'
import { SpanProcessor, BatchSpanProcessor, TracerConfig } from '@opentelemetry/sdk-trace-base'
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector'
import { registerInstrumentations, InstrumentationOption } from '@opentelemetry/instrumentation'

import { createClient, createResource, parseDsn, Dsn, Config as BaseConfig } from '@uptrace/core'

const hasWindow = typeof window !== 'undefined'

let _CLIENT = createClient(parseDsn('https://<key>@uptrace.dev/<project_id>'))

export function reportException(err: Error | string, attrs: SpanAttributes = {}) {
  _CLIENT.reportException(err, attrs)
}

export function traceUrl(span: Span): string {
  return _CLIENT.traceUrl(span)
}

//------------------------------------------------------------------------------

export interface Config extends BaseConfig, TracerConfig {
  contextManager?: ContextManager
  textMapPropagator?: TextMapPropagator
  instrumentations?: InstrumentationOption[]
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

  let dsn: Dsn

  try {
    dsn = parseDsn(cfg.dsn)
  } catch (err) {
    console.error('Uptrace is disabled:', String(err))
    return
  }

  _CLIENT = createClient(dsn)

  const exporter = new CollectorTraceExporter({
    url: 'https://otlp.uptrace.dev/v1/traces',
    headers: { 'uptrace-dsn': cfg.dsn },
  })
  const spanProcessor = new BatchSpanProcessor(exporter, {
    maxExportBatchSize: 1000,
    maxQueueSize: 1000,
    scheduledDelayMillis: 5 * 1000,
  })

  const provider = new WebTracerProvider({
    sampler: cfg.sampler,
    spanLimits: cfg.spanLimits,
    resource: cfg.resource,
    idGenerator: cfg.idGenerator,
    forceFlushTimeoutMillis: cfg.forceFlushTimeoutMillis,
  })

  if (hasWindow) {
    provider.addSpanProcessor(new WindowAttributesProcessor())
  }
  provider.addSpanProcessor(spanProcessor)

  provider.register({
    contextManager: cfg.contextManager,
    propagator: cfg.textMapPropagator,
  })

  registerInstrumentations({
    instrumentations: cfg.instrumentations,
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

export class WindowAttributesProcessor implements SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve()
  }

  onStart(span: Span): void {
    if (window.navigator && window.navigator.userAgent) {
      span.setAttribute('http.user_agent', window.navigator.userAgent)
    }
    if (window.location && window.location.href) {
      span.setAttribute('location.href', location.href)
    }
  }

  onEnd(): void {}

  shutdown(): Promise<void> {
    return Promise.resolve()
  }
}
