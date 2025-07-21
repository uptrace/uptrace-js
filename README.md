# Uptrace for Node.js and Web

![build workflow](https://github.com/uptrace/uptrace-js/actions/workflows/build.yml/badge.svg)
[![Documentation](https://img.shields.io/badge/uptrace-documentation-informational)](https://uptrace.dev/get/opentelemetry-js/node)
[![Chat](https://img.shields.io/badge/-telegram-red?color=white&logo=telegram&logoColor=black)](https://t.me/uptrace)

<a href="https://uptrace.dev/get/opentelemetry-js/node">
  <img src="https://uptrace.dev/devicon/javascript-original.svg" height="200px" />
</a>

## Introduction

uptrace-js is an OpenTelemery distribution configured to export
[traces](https://uptrace.dev/opentelemetry/distributed-tracing) and
[metrics](https://uptrace.dev/opentelemetry/metrics) to Uptrace.

uptrace-js comes in two flavors:

- [@uptrace/node](https://uptrace.dev/get/opentelemetry-js/node) - for Node.js.
- [@uptrace/web](https://uptrace.dev/get/opentelemetry-js/browser) - for Web browsers.

## Quickstart

Install uptrace-js:

```bash
yarn add @uptrace/node --save
```

Run the [basic example](example/basic-node) below using the DSN from the Uptrace project
settings page.

```js
// The very first import must be Uptrace/OpenTelemetry.
const otel = require('@opentelemetry/api')
const { configureOpentelemetry } = require('@uptrace/node')

// Start OpenTelemetry SDK and invoke instrumentations to patch the code.
const sdk = configureOpentelemetry({
  // Set dsn or UPTRACE_DSN env var.
  //dsn: '',
  serviceName: 'myservice',
  serviceVersion: '1.0.0',
})
sdk.start()

// Create a tracer. Usually, tracer is a global variable.
const tracer = otel.trace.getTracer('app_or_package_name', '1.0.0')

// Create a root span (a trace) to measure some operation.
tracer.startActiveSpan('main-operation', (main) => {
  tracer.startActiveSpan('child1-of-main', (child1) => {
    child1.setAttribute('key1', 'value1')
    child1.recordException(new Error('error1'))
    child1.end()
  })

  tracer.startActiveSpan('child2-of-main', (child2) => {
    child2.setAttribute('key2', 42)
    child2.end()
  })

  // End the span when the operation we are measuring is done.
  main.end()

  console.log(sdk.traceUrl(main))
})

setTimeout(async () => {
  // Send buffered spans and free resources.
  await sdk.shutdown()
})
```

## Links

- [Examples](example)
- [OpenTelemetry Node.js](https://uptrace.dev/get/opentelemetry-js/node)
- [OpenTelemetry Express.js](https://uptrace.dev/guides/opentelemetry-express)
