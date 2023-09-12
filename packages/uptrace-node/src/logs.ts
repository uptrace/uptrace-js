import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'

import { Dsn } from '@uptrace/core'
import { Config } from './config'

export function configureLogs(conf: Config, dsn: Dsn) {
  const exporter = new OTLPLogExporter({
    url: `${dsn.otlpAddr()}/v1/logs`,
    headers: { 'uptrace-dsn': conf.dsn },
    compression: CompressionAlgorithm.GZIP,
  })
  conf.logRecordProcessor = new BatchLogRecordProcessor(exporter)
}
