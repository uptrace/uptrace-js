import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { SpanProcessor, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { createSessionSpanProcessor } from '@opentelemetry/web-common'

import { Dsn } from '@uptrace/core'
import { Config } from './config'
import { BaggageSpanProcessor, WindowAttributesProcessor } from './processors'

const hasWindow = typeof window !== 'undefined'

export function configureTracing(conf: Config, dsn: Dsn) {
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
    new BaggageSpanProcessor(),
    createSessionSpanProcessor(conf.sessionProvider!),
  ]
  if (hasWindow) {
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
}
