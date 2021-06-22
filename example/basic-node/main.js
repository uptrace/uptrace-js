const otel = require('@opentelemetry/api')
const uptrace = require('@uptrace/node')

// Configure OpenTelemetry with sensible defaults.
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
  // Create a tracer. Usually, tracer is a global variable.
  const tracer = otel.trace.getTracer('app_or_package_name', '1.0.0')

  // Create a root span (a trace) to measure some operation.
  tracer.startActiveSpan('main-operation', (main) => {
    tracer.startActiveSpan('child1-of-main', (child1) => {
      child1.setAttribute('key1', 'value1')
      child1.recordException(new Error('error1'))
      child1.end()
    })

    tracer.startActiveSpan('child2-of-main', (child2) => {
      child2.setAttribute('key2', 42)
      child2.end()
    })

    // End the span when the operation we are measuring is done.
    main.end()

    console.log(uptrace.traceUrl(main))
  })

  setTimeout(async () => {
    // Send buffered spans and free resources.
    await uptrace.shutdown()
  })
}
