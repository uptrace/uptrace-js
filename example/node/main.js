const otel = require('@opentelemetry/api')
const uptrace = require('@uptrace/node')

const upclient = uptrace.createClient({
  serviceName: 'myservice',
  serviceVersion: '1.0.0',
})

// Use upclient to report errors when there are no spans.
upclient.reportException(new Error('Hello from uptrace-js'), { key1: 'value1' })

const tracer = otel.trace.getTracer('app_or_package_name', '1.0.0')

const mainSpan = tracer.startSpan('main')
const ctx = otel.setSpan(otel.context.active(), mainSpan)

const child1 = tracer.startSpan('child1', undefined, ctx)
child1.setAttribute('key1', 'value1')
child1.recordException(new Error('error1'))
child1.end()

const child2 = tracer.startSpan('child2', undefined, ctx)
child2.setAttribute('key2', 42)
child2.end()

mainSpan.end()
console.log(upclient.traceUrl(mainSpan))

// Flush and close the client.
setTimeout(async () => {
  await upclient.close()
}, 1000)
