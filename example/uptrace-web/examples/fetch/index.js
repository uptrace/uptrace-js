const { context, trace } = require('@opentelemetry/api')
const { ZoneContextManager } = require('@opentelemetry/context-zone')
const { getWebAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-web')
const { configureOpentelemetry } = require('@uptrace/web')

const sdk = configureOpentelemetry({
  // Set dsn or UPTRACE_DSN env var.
  dsn: process.env.UPTRACE_DSN,
  serviceName: 'myservice',
  serviceVersion: '1.0.0',
  instrumentations: [getWebAutoInstrumentations({})],
  contextManager: new ZoneContextManager(),
})
sdk.start()

const tracer = trace.getTracer('app_or_package_name', '1.0.0')

const getData = (url) =>
  fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

// example of keeping track of context between async operations
const prepareClickEvent = () => {
  const url = 'https://httpbin.org/get'

  const element = document.getElementById('button1')

  const onClick = () => {
    const singleSpan = tracer.startSpan('files-series-info')
    context.with(trace.setSpan(context.active(), singleSpan), () => {
      getData(url).then((_data) => {
        trace.getSpan(context.active()).addEvent('fetching-single-span-completed')
        console.log('trace', sdk.traceUrl(singleSpan))
        singleSpan.end()
      })
    })
    for (let i = 0, j = 5; i < j; i += 1) {
      const span = tracer.startSpan(`files-series-info-${i}`)
      context.with(trace.setSpan(context.active(), span), () => {
        getData(url).then((_data) => {
          trace.getSpan(context.active()).addEvent(`fetching-span-${i}-completed`)
          span.end()
        })
      })
    }
  }
  element.addEventListener('click', onClick)
}

window.addEventListener('load', prepareClickEvent)
