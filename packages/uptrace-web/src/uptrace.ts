import { Span, SpanAttributes, ContextManager, TextMapPropagator } from '@opentelemetry/api'
import { SpanProcessor, BatchSpanProcessor, TracerConfig } from '@opentelemetry/sdk-trace-base'
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { registerInstrumentations, Instrumentation } from '@opentelemetry/instrumentation'

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
  instrumentations?: (Instrumentation | Instrumentation[])[]
}

export function configureOpentelemetry(conf: Config) {
  configureResource(conf)
  configureTracing(conf)

  if (hasWindow) {
    setupOnError()
  }
}

function configureResource(conf: Config) {
  conf.resource = createResource(
    conf.resource,
    conf.resourceAttributes,
    conf.serviceName ?? '',
    conf.serviceVersion ?? '',
    conf.deploymentEnvironment ?? '',
  )
}

function configureTracing(conf: Config) {
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

  const exporter = new OTLPTraceExporter({
    url: `${dsn.otlpHttpEndpoint()}/v1/traces`,
    headers: { 'uptrace-dsn': conf.dsn },
  })
  const spanProcessor = new BatchSpanProcessor(exporter, {
    maxExportBatchSize: 1000,
    maxQueueSize: 1000,
    scheduledDelayMillis: 5 * 1000,
  })

  const provider = new WebTracerProvider({
    sampler: conf.sampler,
    spanLimits: conf.spanLimits,
    resource: conf.resource,
    idGenerator: conf.idGenerator,
    forceFlushTimeoutMillis: conf.forceFlushTimeoutMillis,
  })

  if (hasWindow) {
    provider.addSpanProcessor(new WindowAttributesProcessor())
  }
  provider.addSpanProcessor(spanProcessor)

  provider.register({
    contextManager: conf.contextManager,
    propagator: conf.textMapPropagator,
  })

  if (conf.instrumentations) {
    registerInstrumentations({
      instrumentations: conf.instrumentations,
    })
  }
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

export function shutdown(): Promise<void> {
  // TODO: provide shutdown
  return Promise.resolve()
}
