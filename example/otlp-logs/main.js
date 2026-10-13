const { SeverityNumber } = require('@opentelemetry/api-logs')
const { LoggerProvider, BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs')
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http')

const dsn = process.env.UPTRACE_DSN
console.log('using dsn:', dsn)

const loggerExporter = new OTLPLogExporter({
  url: `https://api.uptrace.dev/v1/logs`,
  headers: { 'uptrace-dsn': dsn },
  compression: 'gzip',
})
const loggerProvider = new LoggerProvider({
  processors: [new BatchLogRecordProcessor({ exporter: loggerExporter })],
})

const logger = loggerProvider.getLogger('app_or_package_name', '1.0.0')
logger.emit({
  severityNumber: SeverityNumber.INFO,
  severityText: 'info',
  body: 'this is a log body',
  attributes: { 'log.type': 'custom' },
})

loggerProvider.shutdown().catch(console.error)
