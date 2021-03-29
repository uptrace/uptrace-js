'use strict'

const port = 9999
const otel = require('@opentelemetry/api')
const { getSpan, context } = require('@opentelemetry/api')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const uptrace = require('@uptrace/node')

uptrace
  .configureOpentelemetry({
    // Set dsn or UPTRACE_DSN env var.
    dsn: '',

    serviceName: 'myservice',
    serviceVersion: '1.0.0',

    plugins: {
      http: { enabled: false, path: '@opentelemetry/plugin-http' },
      https: { enabled: false, path: '@opentelemetry/plugin-https' },
    },
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
  })
  .start()
  .then(main)

function main() {
  const otel = require('@opentelemetry/api')
  const express = require('express')
  const app = express()
  const tracer = otel.trace.getTracer('express-example')

  app.get('/', indexHandler)
  app.get('/hello/:username', helloHandler)

  app.listen(9999, () => {
    console.log(`listening at http://localhost:${port}`)
  })
}

function indexHandler(req, res) {
  const traceUrl = uptrace.traceUrl(getSpan(context.active()))
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
  const username = req.params.username
  const traceUrl = uptrace.traceUrl(getSpan(context.active()))

  res.send(
    `<html>` +
      `<h3>Hello ${username}</h3>` +
      `<p><a href="${traceUrl}">${traceUrl}</a></p>` +
      `</html>`,
  )
}
