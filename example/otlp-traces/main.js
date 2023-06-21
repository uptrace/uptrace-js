'use strict'

const otel = require('@opentelemetry/api')
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base')
const { Resource } = require('@opentelemetry/resources')
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
const { AWSXRayIdGenerator } = require('@opentelemetry/id-generator-aws-xray')

const dsn = process.env.UPTRACE_DSN
console.log('using dsn:', dsn)

const exporter = new OTLPTraceExporter({
  url: 'https://otlp.uptrace.dev/v1/traces',
  headers: { 'uptrace-dsn': dsn },
  compression: 'gzip',
})
const bsp = new BatchSpanProcessor(exporter, {
  maxExportBatchSize: 1000,
  maxQueueSize: 1000,
})

const sdk = new NodeSDK({
  spanProcessor: bsp,
  resource: new Resource({
    'service.name': 'myservice',
    'service.version': '1.0.0',
  }),
  idGenerator: new AWSXRayIdGenerator(),
})
sdk.start()

const tracer = otel.trace.getTracer('app_or_package_name', '1.0.0')

tracer.startActiveSpan('main', (main) => {
  main.end()
  console.log('trace id:', main.spanContext().traceId)
})

// Send buffered spans.
setTimeout(async () => {
  await sdk.shutdown()
}, 1000)
