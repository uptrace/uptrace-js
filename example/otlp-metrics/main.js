'use strict'

const otel = require('@opentelemetry/api')
const { Resource } = require('@opentelemetry/resources')
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http')
const {
  PeriodicExportingMetricReader,
  AggregationTemporality,
} = require('@opentelemetry/sdk-metrics')

const dsn = process.env.UPTRACE_DSN
console.log('using dsn:', dsn)

const exporter = new OTLPMetricExporter({
  url: 'https://api.uptrace.dev/v1/metrics',
  headers: { 'uptrace-dsn': dsn },
  compression: 'gzip',
})
const metricReader = new PeriodicExportingMetricReader({
  exporter: exporter,
  exportIntervalMillis: 15000,
})

const sdk = new NodeSDK({
  metricReader: metricReader,
  resource: new Resource({
    'service.name': 'myservice',
    'service.version': '1.0.0',
  }),
})
sdk.start()

const meter = otel.metrics.getMeter('app_or_package_name', '1.0.0')

const requestCounter = meter.createCounter('requests', {
  description: 'Example of a Counter',
})

const upDownCounter = meter.createUpDownCounter('test_up_down_counter', {
  description: 'Example of a UpDownCounter',
})

const attributes = { environment: 'staging' }

setInterval(() => {
  requestCounter.add(1, attributes)
  upDownCounter.add(Math.random() > 0.5 ? 1 : -1, attributes)
}, 1000)
