const { SeverityNumber } = require('@opentelemetry/api-logs')
const { LoggerProvider, BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs')
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http')
const { CompressionAlgorithm } = require('@opentelemetry/otlp-exporter-base')

const dsn = process.env.UPTRACE_DSN
console.log('using dsn:', dsn)

const loggerExporter = new OTLPLogExporter({
  url: `https://otlp.uptrace.dev/v1/logs`,
  headers: { 'uptrace-dsn': dsn },
  compression: CompressionAlgorithm.GZIP,
})
const loggerProvider = new LoggerProvider()

loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(loggerExporter))

const logger = loggerProvider.getLogger('example-logger')
logger.emit({
  severityNumber: SeverityNumber.INFO,
  severityText: 'info',
  body: 'this is a log body',
  attributes: { 'log.type': 'custom' },
})

loggerProvider.shutdown().catch(console.error)
