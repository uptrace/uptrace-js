import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { logs } from '@opentelemetry/api-logs'

import { Dsn } from '@uptrace/core'
import { Config } from './config'

export function configureLogs(conf: Config, dsn: Dsn): LoggerProvider {
  const exporter = new OTLPLogExporter({
    url: `${dsn.otlpHttpEndpoint()}/v1/logs`,
    headers: { 'uptrace-dsn': conf.dsn! },
    compression: CompressionAlgorithm.GZIP,
  })
  const blp = new BatchLogRecordProcessor(exporter)
  const provider = new LoggerProvider({
    resource: conf.resource,
    processors: [blp],
  })
  logs.setGlobalLoggerProvider(provider)
  return provider
}
