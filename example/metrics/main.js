'use strict'

const otel = require('@opentelemetry/api')
const uptrace = require('@uptrace/node')

// Configure OpenTelemetry with sensible defaults.
uptrace.configureOpentelemetry({
  // Set dsn or UPTRACE_DSN env var.
  dsn: '',
  serviceName: 'myservice',
  serviceVersion: '1.0.0',
})

const meter = otel.metrics.getMeter('example')

const requestCounter = meter.createCounter('requests', {
  description: 'Example of a Counter',
})

const upDownCounter = meter.createUpDownCounter('test_up_down_counter', {
  description: 'Example of a UpDownCounter',
})

const attributes = { environment: 'staging' }

interval = setInterval(() => {
  requestCounter.add(1, attributes)
  upDownCounter.add(Math.random() > 0.5 ? 1 : -1, attributes)
}, 1000)
