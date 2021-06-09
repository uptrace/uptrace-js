const otel = require('@opentelemetry/api')
const {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  BatchSpanProcessor,
} = require('@opentelemetry/tracing')
const { NodeTracerProvider } = require('@opentelemetry/node')
const { CollectorTraceExporter } = require('@opentelemetry/exporter-collector')

const exporter = new CollectorTraceExporter({
  url: 'https://otlp.uptrace.dev/v1/traces',
  headers: {
    // Set the Uptrace DSN here or use UPTRACE_DSN env var.
    'uptrace-dsn': process.env.UPTRACE_DSN,
  },

  serviceName: 'myservice',
  serviceVersion: '1.0.0',
})
const bsp = new BatchSpanProcessor(exporter, {
  maxExportBatchSize: 1000,
  maxQueueSize: 1000,
})

const provider = new NodeTracerProvider()
provider.addSpanProcessor(bsp)
//provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))
provider.register()

const tracer = otel.trace.getTracer('app_or_package_name', '1.0.0')

tracer.startActiveSpan('main', (main) => {
  tracer.startActiveSpan('child1', (child1) => {
    child1.setAttribute('key1', 'value1')
    child1.recordException(new Error('error1'))
    child1.end()
  })

  tracer.startActiveSpan('child2', (child2) => {
    child2.setAttribute('key2', 42)
    child2.end()
  })

  main.end()
  console.log('trace id:', main.spanContext().traceId)
})

// Send buffered spans.
setTimeout(async () => {
  await provider.shutdown()
}, 1000)
