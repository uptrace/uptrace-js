const otel = require('@opentelemetry/api')
const uptrace = require('@uptrace/node')

uptrace
  .configureOpentelemetry({
    // Set dsn or UPTRACE_DSN env var.
    dsn: '',
    serviceName: 'myservice',
    serviceVersion: '1.0.0',
  })
  .start()
  .then(main)

function main() {
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
    console.log(uptrace.traceUrl(main))
  })

  // Send buffered spans.
  setTimeout(async () => {
    await uptrace.shutdown()
  })
}
