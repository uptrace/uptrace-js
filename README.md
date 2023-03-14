# Uptrace for Node.js and Web

![build workflow](https://github.com/uptrace/uptrace-js/actions/workflows/build.yml/badge.svg)
[![Documentation](https://img.shields.io/badge/uptrace-documentation-informational)](https://uptrace.dev/get/opentelemetry-js-node.html)
[![Chat](https://img.shields.io/badge/-telegram-red?color=white&logo=telegram&logoColor=black)](https://t.me/uptrace)

<a href="https://uptrace.dev/get/opentelemetry-js-node.html">
  <img src="https://uptrace.dev/get/devicon/javascript-original.svg" height="200px" />
</a>

## Introduction

uptrace-js is an OpenTelemery distribution configured to export
[traces](https://uptrace.dev/opentelemetry/distributed-tracing.html) and
[metrics](https://uptrace.dev/opentelemetry/metrics.html) to Uptrace.

uptrace-js comes in two flavors:

- [@uptrace/node](https://uptrace.dev/get/opentelemetry-js-node.html) - for Node.js.
- [@uptrace/web](https://uptrace.dev/get/uptrace-js-browser.html) - for Web browsers.

## Quickstart

Install uptrace-js:

```bash
yarn add @uptrace/node --save
```

Run the [basic example](example/basic-node) below using the DSN from the Uptrace project settings
page.

```js
// The very first import must be Uptrace/OpenTelemetry.
const otel = require('@opentelemetry/api')
const uptrace = require('@uptrace/node')

// Configure NodeSDK instance.
const nodeSDK = uptrace.configureOpentelemetry({
  // Set dsn or UPTRACE_DSN env var.
  //dsn: '',
  serviceName: 'myservice',
  serviceVersion: '1.0.0',
})

// Start OpenTelemetry SDK and invoke instrumentations to patch the code.
nodeSDK.start()

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

  console.log(uptrace.traceUrl(main))
})

setTimeout(async () => {
  // Send buffered spans and free resources.
  await uptrace.shutdown()
})
```

## Links

- [Examples](example)
- [OpenTelemetry Node.js](https://uptrace.dev/get/opentelemetry-js-node.html)
- [OpenTelemetry JS Instrumentations](https://uptrace.dev/opentelemetry/instrumentations/?lang=js)
- [OpenTelemetry Express.js](https://uptrace.dev/opentelemetry/instrumentations/node-express.html)
