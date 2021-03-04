const otel = require('@opentelemetry/api')
const { BatchSpanProcessor } = require('@opentelemetry/tracing')
const { NodeTracerProvider } = require('@opentelemetry/node')
const { CollectorTraceExporter } = require('@opentelemetry/exporter-collector')

const exporter = new CollectorTraceExporter({
  url: 'https://otlp.uptrace.dev/v1/traces',
  headers: {
    // Set the Uptrace token here or use UPTRACE_TOKEN env var.
    'uptrace-token': process.env.UPTRACE_TOKEN,
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
provider.register()

const tracer = otel.trace.getTracer('app_or_package_name', '1.0.0')

const main = tracer.startSpan('main')
otel.context.with(otel.setSpan(otel.context.active(), main), () => {
  const child1 = tracer.startSpan('child1')
  otel.context.with(otel.setSpan(otel.context.active(), child1), () => {
    child1.setAttribute('key1', 'value1')
    child1.recordException(new Error('error1'))
    child1.end()
  })

  const child2 = tracer.startSpan('child2')
  otel.context.with(otel.setSpan(otel.context.active(), child1), () => {
    child2.setAttribute('key2', 42)
    child2.end()
  })

  console.log('trace id:', main.context().traceId)
  main.end()
})

// Flush the buffers.
setTimeout(async () => {
  await bsp.shutdown()
})
