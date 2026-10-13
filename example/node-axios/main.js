'use strict'

const otel = require('@opentelemetry/api')
const uptrace = require('@uptrace/node')

// Configure OpenTelemetry before importing Axios.
const sdk = uptrace.configureOpentelemetry({
  // Set dsn or UPTRACE_DSN env var.
  //dsn: '',
  serviceName: 'myservice',
  serviceVersion: '1.0.0',
})
sdk.start()

// Import Axios after OpenTelemetry has been configured.
const axios = require('axios')

// Create a tracer. Usually, tracer is a global variable.
const tracer = otel.trace.getTracer('app_or_package_name', '1.0.0')

const fetchData = async () => {
  return await tracer.startActiveSpan('fetchData', async (span) => {
    console.log(sdk.traceUrl(span))

    let data = ''

    try {
      const response = await axios({
        method: 'get',
        url: 'https://ip2c.org/self',
      })
      data = response.data
      span.setAttribute('response.data', response.data)

      span.setStatus({ code: otel.SpanStatusCode.OK })
    } catch (error) {
      span.recordException(error)
      span.setStatus({ code: otel.SpanStatusCode.ERROR })
    } finally {
      span.end()
    }

    return data
  })
}

setTimeout(async () => {
  console.log(await fetchData())

  // Send buffered spans and free resources.
  await sdk.shutdown()
})
