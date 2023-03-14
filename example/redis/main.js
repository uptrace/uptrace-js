'use strict'

const { createClient } = require('redis')
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

const tracer = otel.trace.getTracer('app_or_package_name', '1.0.0')

const client = createClient()
client.on('error', (err) => console.log('Redis Client Error', err))

await main()

async function main() {
  await client.connect()
  await client.set('foo', 'bar')

  // Create a root span (a trace) to measure some operation.
  await tracer.startActiveSpan('root-operation', { kind: otel.SpanKind.SERVER }, async (main) => {
    try {
      console.log(await redisGet('foo'))
    } finally {
      main.end()
    }
    console.log(uptrace.traceUrl(main))
  })

  setTimeout(async () => {
    await client.disconnect()

    // Send buffered spans and free resources.
    await uptrace.shutdown()
  })
}

async function redisGet(key) {
  return await tracer.startActiveSpan('redisGet', { kind: otel.SpanKind.CLIENT }, async (span) => {
    if (span.isRecording()) {
      span.setAttribute('redis.key', key)
    }

    let value

    try {
      value = await client.get(key)
    } catch (exc) {
      span.recordException(exc)
      span.setStatus({ code: otel.SpanStatusCode.ERROR, message: String(exc) })
    } finally {
      span.end()
    }

    return value
  })
}
