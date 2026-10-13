'use strict'

const { trace, context } = require('@opentelemetry/api')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const uptrace = require('@uptrace/node')

const sdk = uptrace.configureOpentelemetry({
  // Set dsn or UPTRACE_DSN env var.
  //dsn: '',

  serviceName: 'myservice',
  serviceVersion: '1.0.0',

  instrumentations: [
    new HttpInstrumentation({}),
    new ExpressInstrumentation({
      ignoreLayersType: ['middleware'],
    }),
  ],
})
sdk.start()

const otel = require('@opentelemetry/api')
const express = require('express')
const app = express()
const tracer = otel.trace.getTracer('express-example')

app.get('/', indexHandler)
app.get('/hello/:username', helloHandler)

const port = 9999
app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
})

function indexHandler(req, res) {
  const traceUrl = sdk.traceUrl(trace.getSpan(context.active()))
  res.send(
    `<html>` +
      `<p>Here are some routes for you:</p>` +
      `<ul>` +
      `<li><a href="/hello/world">Hello world</a></li>` +
      `<li><a href="/hello/foo-bar">Hello foo-bar</a></li>` +
      `<p><a href="${traceUrl}">${traceUrl}</a></p>` +
      `</ul>` +
      `</html>`,
  )
}

function helloHandler(req, res) {
  const span = trace.getSpan(context.active())

  const err = new Error('User not found')
  span.recordException(err)

  const username = req.params.username
  const traceUrl = sdk.traceUrl(span)
  res.send(
    `<html>` +
      `<h3>Hello ${username}</h3>` +
      `<p><a href="${traceUrl}">${traceUrl}</a></p>` +
      `</html>`,
  )
}
