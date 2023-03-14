'use strict'

require('./tracer')('postgres-client-service')
const uptrace = require('@uptrace/node')
const otel = require('@opentelemetry/api')
// eslint-disable-next-line import/order
const http = require('http')

const tracer = otel.trace.getTracer('example-postgres')

makeRequest()

setTimeout(async () => {
  // Send buffered spans and free resources.
  await uptrace.shutdown()
})

function makeRequest() {
  const span = tracer.startActiveSpan('makeRequest', (span) => {
    console.log('Client traceId ', span.spanContext().traceId)

    const randomId = Math.floor(Math.random() * 10)
    http.get({
      host: 'localhost',
      port: 3123,
      path: `/insert?id=${randomId}&text=randomstring`,
    })

    http.get({
      host: 'localhost',
      port: 3123,
      path: `/get?id=${randomId}`,
    })

    span.end()
  })
}
