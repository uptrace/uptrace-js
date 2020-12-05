const uptrace = require('@uptrace/node')

const upclient = uptrace.createClient()

// Report an exception.
upclient.reportException(new Error('hello world'), {
  foo: 'bar',
})

const tracer = upclient.getTracer('github.com/uptrace/uptrace-js')

// Start a root/main span (span without a parent).
const mainSpan = tracer.startSpan('main span')

// Activate main span.
tracer.withSpan(mainSpan, () => {
  // span1 is a child of mainSpan.
  const span1 = tracer.startSpan('span1', {
    parent: tracer.getCurrentSpan(),
  })

  // Activate span1.
  tracer.withSpan(span1, () => {
    const span = tracer.getCurrentSpan() // == span1
    span.setAttribute('key1', 'value1')
    span.addEvent('event-name')
    span.end()
  })

  // span2 is a child of mainSpan.
  const span2 = tracer.startSpan('span2', {
    parent: tracer.getCurrentSpan(),
  })

  // Activate span2.
  tracer.withSpan(span2, () => {
    const span = tracer.getCurrentSpan() // == span2
    span.setAttribute('key2', 'value2')
    span.addEvent('event-name')
    span.end()
  })

  const span = tracer.getCurrentSpan() // == mainSpan
  span.end()

  console.log(upclient.traceUrl(span))
})

// Flush and close the client.
setTimeout(async () => {
  await upclient.close()
}, 1000)
