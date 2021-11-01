import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core'
import { Span, SpanAttributes } from '@opentelemetry/api'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSDK, NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector'

import { createClient, createResource, parseDSN, DSN, Config as BaseConfig } from '@uptrace/core'

let _CLIENT = createClient(parseDSN('https://TOKEN@api.uptrace.dev/PROJECT_ID'))

export function traceUrl(span: Span): string {
  return _CLIENT.traceUrl(span)
}

export function reportException(err: Error | string, attrs: SpanAttributes = {}) {
  _CLIENT.reportException(err, attrs)
}

//------------------------------------------------------------------------------

let _SDK: NodeSDK | undefined

export interface Config extends BaseConfig, Partial<NodeSDKConfiguration> {}

// configureOpentelemetry configures OpenTelemetry to export data to Uptrace.
// By default it:
//   - creates tracer provider;
//   - registers Uptrace span exporter;
//   - sets tracecontext + baggage composite context propagator.
export function configureOpentelemetry(cfg: Config): NodeSDK {
  configureResource(cfg)
  configureTracing(cfg)
  configurePropagator(cfg)

  _SDK = new NodeSDK(cfg)
  return _SDK
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
  if (!cfg.dsn && process.env.UPTRACE_DSN) {
    cfg.dsn = process.env.UPTRACE_DSN
  }

  let dsn: DSN

  try {
    dsn = parseDSN(cfg.dsn)
  } catch (err) {
    console.error('Uptrace is disabled:', String(err))
    return
  }

  _CLIENT = createClient(dsn)

  const exporter = new CollectorTraceExporter({
    url: 'https://otlp.uptrace.dev/v1/traces',
    headers: { 'uptrace-dsn': cfg.dsn },
  })
  // TODO: spanProcessor is deprecated
  cfg.spanProcessor = new BatchSpanProcessor(exporter, {
    maxExportBatchSize: 1000,
    maxQueueSize: 1000,
    scheduledDelayMillis: 5 * 1000,
  })
}

function configurePropagator(cfg: Config) {
  if (!cfg.textMapPropagator) {
    cfg.textMapPropagator = new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    })
  }
}

export function shutdown(): Promise<void> {
  if (_SDK) {
    return _SDK.shutdown()
  }
  return Promise.resolve()
}
