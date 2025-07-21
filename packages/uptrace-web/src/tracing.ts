import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'

import { Dsn } from '@uptrace/core'
import { Config } from './config'

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

  const provider = new WebTracerProvider({
    resource: conf.resource,
    spanProcessors: [...conf.spanProcessors!, bsp],
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
