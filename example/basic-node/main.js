const otel = require('@opentelemetry/api')
const uptrace = require('@uptrace/node')

const upclient = uptrace.createClient({
  // Set dsn or UPTRACE_DSN env var.
  dsn: '',
  serviceName: 'myservice',
  serviceVersion: '1.0.0',
})

// Use upclient to report errors when there are no spans.
upclient.reportException(new Error('Hello from uptrace-js'), { key1: 'value1' })

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

  main.end()
  console.log(upclient.traceUrl(main))
})

// Flush and close the client.
setTimeout(async () => {
  await upclient.close()
})
