const otel = require('@opentelemetry/api')
const uptrace = require('@uptrace/node')

const upclient = uptrace.createClient({
  serviceName: 'myservice',
  serviceVersion: '1.0.0',
  //console: true,
})

const tracer = otel.trace.getTracer('app_or_package_name', '1.0.0')

spanExample()
activeSpanExample()

// This example shows how to start a span and set some attributes.
function spanExample() {
  const span = tracer.startSpan('span', { kind: otel.SpanKind.SERVER })

  if (span.isRecording()) {
    span.setAttribute('key1', 'value1')
    span.setAttributes({ key2: 123.456, key3: [1, 2, 3] })

    span.addEvent('log', {
      'log.severity': 'error',
      'log.message': 'User not found',
      'enduser.id': '123',
    })

    span.recordException(new Error('error1'))

    span.setStatus({ code: otel.SpanStatusCode.ERROR, message: 'error description' })
  }

  span.end()
}

// This example shows how to get/set active span from context.
function activeSpanExample() {
  const main = tracer.startSpan('main')
  otel.context.with(otel.setSpan(otel.context.active(), main), () => {
    if (otel.getSpan(otel.context.active()) === main) {
      console.log('main is active')
    }

    const child = tracer.startSpan('child')
    otel.context.with(otel.setSpan(otel.context.active(), child), () => {
      if (otel.getSpan(otel.context.active()) === child) {
        console.log('child is active')
      }
      child.end()
    })

    if (otel.getSpan(otel.context.active()) === main) {
      console.log('main is active again')
    }

    main.end()
  })
}
