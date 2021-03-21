const otel = require('@opentelemetry/api')
const uptrace = require('@uptrace/node')

uptrace
  .configureOpentelemetry({
    serviceName: 'myservice',
    serviceVersion: '1.0.0',
    //console: true,
  })
  .start()
  .then(main)

function main() {
  const tracer = otel.trace.getTracer('app_or_package_name', '1.0.0')

  spanExample(tracer)
  activeSpanExample(tracer)
  contextExample(tracer)
}

// This example shows how to start a span and set some attributes.
function spanExample(tracer) {
  const span = tracer.startSpan('span', { kind: otel.SpanKind.SERVER })
  // Activate the span.
  otel.context.with(otel.setSpan(otel.context.active(), span), () => {
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
  })
}

// This example shows how to get/set active span from context.
function activeSpanExample(tracer) {
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

function contextExample(tracer) {
  const span = tracer.startSpan('main')

  // By default context is empty.
  const ctx1 = otel.context.active()
  console.log(otel.getSpan(ctx1) === undefined) // true

  // setSpan creates a new context with the span.
  const ctx2 = otel.setSpan(ctx1, span)
  console.log(ctx2 === ctx1) // false
  console.log(otel.getSpan(ctx2) === span) // true

  // Activate the ctx2 that carries the span.
  otel.context.with(ctx2, () => {
    console.log(otel.context.active() === ctx2) // true
  })
}
