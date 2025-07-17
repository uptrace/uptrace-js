import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base'
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  AggregationTemporality,
} from '@opentelemetry/sdk-metrics'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { metrics } from '@opentelemetry/api'

import { Dsn } from '@uptrace/core'
import { Config } from './config'

export function configureMetrics(conf: Config, dsn: Dsn): MeterProvider {
  const reader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${dsn.otlpHttpEndpoint()}/v1/metrics`,
      headers: { 'uptrace-dsn': conf.dsn! },
      compression: CompressionAlgorithm.GZIP,
      temporalityPreference: AggregationTemporality.DELTA,
    }),
    exportIntervalMillis: 15000,
  })
  const provider = new MeterProvider({
    resource: conf.resource,
    readers: [reader],
  })
  metrics.setGlobalMeterProvider(provider)
  return provider
}
