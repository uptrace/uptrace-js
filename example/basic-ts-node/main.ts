'use strict'

// The very first import must be Uptrace/OpenTelemetry.
import otel from '@opentelemetry/api'
import { configureOpentelemetry } from '@uptrace/node'

// Start OpenTelemetry SDK and invoke instrumentations to patch the code.
const sdk = configureOpentelemetry({
  // Set dsn or UPTRACE_DSN env var.
  //dsn: '',
  serviceName: 'myservice',
  serviceVersion: '1.0.0',
})
sdk.start()

// Create a tracer. Usually, tracer is a global variable.
const tracer = otel.trace.getTracer('app_or_package_name', '1.0.0')

// Create a root span (a trace) to measure some operation.
tracer.startActiveSpan('main-operation', (main) => {
  tracer.startActiveSpan('GET /posts/:id', (child1) => {
    child1.setAttribute('http.method', 'GET')
    child1.setAttribute('http.route', '/posts/:id')
    child1.setAttribute('http.url', 'http://localhost:8080/posts/123')
    child1.setAttribute('http.status_code', 200)
    child1.recordException(new Error('error1'))
    child1.end()
  })

  tracer.startActiveSpan('SELECT', (child2) => {
    child2.setAttribute('db.system', 'mysql')
    child2.setAttribute('db.statement', 'SELECT * FROM posts LIMIT 100')
    child2.end()
  })

  hello()

  // End the span when the operation we are measuring is done.
  main.end()

  console.log(sdk.traceUrl(main))
})

setTimeout(async () => {
  // Send buffered spans and free resources.
  await sdk.shutdown()
})

function hello() {
  tracer.startActiveSpan('async-func', (span) => {
    span.end()
  })
}
