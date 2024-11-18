import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'

import { Dsn } from '@uptrace/core'
import { Config } from './config'

export function configureTracing(conf: Config, dsn: Dsn) {
  const exporter = new OTLPTraceExporter({
    url: `${dsn.otlpHttpEndpoint()}/v1/traces`,
    headers: { 'uptrace-dsn': conf.dsn! },
    compression: CompressionAlgorithm.GZIP,
  })
  conf.spanProcessor = new BatchSpanProcessor(exporter, {
    maxExportBatchSize: 1000,
    maxQueueSize: 1000,
    scheduledDelayMillis: 5 * 1000,
  })
  conf.idGenerator = new AWSXRayIdGenerator()

  conf.instrumentations ??= [getNodeAutoInstrumentations()]
}
