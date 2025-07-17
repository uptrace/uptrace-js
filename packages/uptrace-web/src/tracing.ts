import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { SpanProcessor, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { ALLOW_ALL_BAGGAGE_KEYS, BaggageSpanProcessor } from '@opentelemetry/baggage-span-processor'
import { createSessionSpanProcessor } from '@opentelemetry/web-common'

import { Dsn } from '@uptrace/core'
import { Config } from './config'
import { WindowAttributesProcessor } from './processors'

export function configureTracing(conf: Config, dsn: Dsn): WebTracerProvider {
  const exporter = new OTLPTraceExporter({
    url: `${dsn.otlpHttpEndpoint()}/v1/traces`,
    headers: { 'uptrace-dsn': conf.dsn! },
  })
  const bsp = new BatchSpanProcessor(exporter, {
    maxExportBatchSize: 1000,
    maxQueueSize: 1000,
    scheduledDelayMillis: 5 * 1000,
  })

  const spanProcessors: SpanProcessor[] = [
    bsp,
    new BaggageSpanProcessor(ALLOW_ALL_BAGGAGE_KEYS),
    createSessionSpanProcessor(conf.sessionProvider!),
  ]
  if (window) {
    spanProcessors.push(new WindowAttributesProcessor())
  }

  const provider = new WebTracerProvider({
    resource: conf.resource,
    spanProcessors: spanProcessors,
    sampler: conf.sampler,
    spanLimits: conf.spanLimits,
    idGenerator: conf.idGenerator,
  })

  provider.register({
    contextManager: conf.contextManager,
    propagator: conf.textMapPropagator,
  })

  return provider
}
