'use strict'

const port = 9999
const otel = require('@opentelemetry/api')
const uptrace = require('@uptrace/node')

uptrace
  .configureOpentelemetry({
    // Set dsn or UPTRACE_DSN env var.
    dsn: '',

    serviceName: 'myservice',
    serviceVersion: '1.0.0',

    instrumentations: [
      {
        plugins: {
          express: {
            enabled: true,
            path: '@opentelemetry/plugin-express',
          },
        },
      },
    ],
  })
  .start()
  .then(main)

function main() {
  const otel = require('@opentelemetry/api')
  const express = require('express')
  const app = express()
  const tracer = otel.trace.getTracer('express-example')

  app.get('/', indexHandler)
  app.get('/profiles/:username', userHandler)

  app.listen(9999, () => {
    console.log(`listening at http://localhost:${port}`)
  })
}

function indexHandler(req, res) {
  const traceUrl = uptrace.traceUrl()
  res.send(
    `<html>` +
      `<p>Here are some routes for you:</p>` +
      `<ul>` +
      `<li><a href="/profiles/world">Hello world</a></li>` +
      `<li><a href="/profiles/foo-bar">Hello foo-bar</a></li>` +
      `<p><a href="${traceUrl}">${traceUrl}</a></p>` +
      `</ul>` +
      `</html>`,
  )
}

function userHandler(req, res) {
  const username = req.params.username
  const traceUrl = uptrace.traceUrl()

  res.send(
    `<html>` +
      `<h3>Hello ${username}</h3>` +
      `<p><a href="${traceUrl}">${traceUrl}</a></p>` +
      `</html>`,
  )
}
