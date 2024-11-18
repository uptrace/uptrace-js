import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base'
import {
  PeriodicExportingMetricReader,
  //InstrumentType,
  //Aggregation,
  AggregationTemporality,
} from '@opentelemetry/sdk-metrics'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'

import { Dsn } from '@uptrace/core'
import { Config } from './config'

export function configureMetrics(conf: Config, dsn: Dsn) {
  conf.metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${dsn.otlpHttpEndpoint()}/v1/metrics`,
      headers: { 'uptrace-dsn': conf.dsn! },
      compression: CompressionAlgorithm.GZIP,
      temporalityPreference: AggregationTemporality.DELTA,
    }),
    exportIntervalMillis: 15000,
    //aggregationSelector: aggregationSelector,
  })
}

// function aggregationSelector(instrumentType: InstrumentType): Aggregation {
//   if (instrumentType === InstrumentType.HISTOGRAM) {
//     return Aggregation.ExponentialHistogram()
//   }
//   return Aggregation.Default()
// }
