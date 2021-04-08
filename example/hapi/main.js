'use strict'

const { getSpan, context } = require('@opentelemetry/api')
const { HapiInstrumentation } = require('@opentelemetry/instrumentation-hapi');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
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
    instrumentations: [new HttpInstrumentation(), new HapiInstrumentation()],
  })
  .start()
  .then(main)

async function main() {
  const otel = require('@opentelemetry/api')
  const Hapi = require('@hapi/hapi');
  const tracer = otel.trace.getTracer('hapi-example')

  const server = await new Hapi.Server({
    port: 9999,
    state: { ignoreErrors: true }, // Ignore invalid cookie value
  });

  server.route({
    method: 'GET',
    path: '/',
    options: {
      handler: async function response() {
        const traceUrl = uptrace.traceUrl(getSpan(context.active()))

        const msg = `<html>` +
          `<p>Here are some routes for you:</p>` +
          `<ul>` +
          `<li><a href="/hello/world">Hello world</a></li>` +
          `<li><a href="/hello/foo-bar">Hello foo-bar</a></li>` +
          `<p><a href="${traceUrl}">${traceUrl}</a></p>` +
          `</ul>` +
          `</html>`
        return msg
      }
    },
  });

  server.route({
    method: 'GET',
    path: '/hello/{username}',
    options: {
      handler: async function response(request) {
        const span = getSpan(context.active())

        const err = new Error('User not found')
        span.recordException(err)

        const username = request.params.username
        const traceUrl = uptrace.traceUrl(span)
        const msg = `<html>` +
          `<h3>Hello ${username}</h3>` +
          `<p><a href="${traceUrl}">${traceUrl}</a></p>` +
          `</html>`
        return msg
      }
    },
  });

  await server.start()
  console.log('Server running on %s', server.info.uri);
}
