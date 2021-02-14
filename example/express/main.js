'use strict'

const otel = require('@opentelemetry/api')
const uptrace = require('@uptrace/node')

// Run this before any other imports for auto-instrumentation to work.
const upclient = uptrace.createClient({
  serviceName: 'myservice',
  serviceVersion: '1.0.0',
})
const tracer = otel.trace.getTracer('express-example')

const express = require('express')
const app = express()

app.get('/profiles/:username', (req, res) => {
  const username = req.params.username

  let name
  try {
    name = selectUser(username)
  } catch {
    name = 'unknown'
  }

  const traceUrl = upclient.traceUrl(otel.getSpan(otel.context.active()))
  res.send(
    `<html>` +
      `<h1>Hello ${username} ${name}</h1>` +
      `<p><a href="${traceUrl}">${traceUrl}</a></p>` +
      `</html>`,
  )
})

const port = 9999

app.listen(9999, () => {
  console.log(`listening at http://localhost:${port}`)
})

function selectUser(username) {
  const currentSpan = otel.getSpan(otel.context.active())
  const span = tracer.startSpan('selectUser', { parent: currentSpan })
  span.setAttribute('username', username)

  if (username === 'admin') {
    span.end()
    return 'Joe'
  }

  const err = new Error(`username=${username} not found`)
  span.recordException(err)
  span.end()
  throw err
}
