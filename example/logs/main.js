'use strict'

const otel = require('@opentelemetry/api')
const { logs, SeverityNumber } = require('@opentelemetry/api-logs')
const uptrace = require('@uptrace/node')

// Configure OpenTelemetry with sensible defaults.
const sdk = uptrace.configureOpentelemetry({
  // Set dsn or UPTRACE_DSN env var.
  //dsn: '',
  serviceName: 'myservice',
  serviceVersion: '1.0.0',
})
sdk.start()

const logger = logs.getLogger('example', '1.0.0')

// emit a log record
logger.emit({
  severityNumber: SeverityNumber.INFO,
  severityText: 'INFO',
  body: 'this is a log record body',
  attributes: { 'log.type': 'custom' },
})

setTimeout(async () => {
  // Send buffered logs and free resources.
  await sdk.shutdown()
})
