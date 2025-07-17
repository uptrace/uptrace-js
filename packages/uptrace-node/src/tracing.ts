import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { ALLOW_ALL_BAGGAGE_KEYS, BaggageSpanProcessor } from '@opentelemetry/baggage-span-processor'

import { Dsn } from '@uptrace/core'
import { Config } from './config'

export function configureTracing(conf: Config, dsn: Dsn) {
  const exporter = new OTLPTraceExporter({
    url: `${dsn.otlpHttpEndpoint()}/v1/traces`,
    headers: { 'uptrace-dsn': conf.dsn! },
    compression: CompressionAlgorithm.GZIP,
  })

  const bsp = new BatchSpanProcessor(exporter, {
    maxExportBatchSize: 1000,
    maxQueueSize: 1000,
    scheduledDelayMillis: 5 * 1000,
  })
  conf.spanProcessors!.push(bsp, new BaggageSpanProcessor(ALLOW_ALL_BAGGAGE_KEYS))
}
