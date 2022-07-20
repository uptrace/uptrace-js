# Uptrace for Node.js and Web

![build workflow](https://github.com/uptrace/uptrace-js/actions/workflows/build.yml/badge.svg)
[![Documentation](https://img.shields.io/badge/uptrace-documentation-informational)](https://uptrace.dev/docs/js-node.html)
[![Chat](https://img.shields.io/matrix/uptrace:matrix.org)](https://matrix.to/#/#uptrace:matrix.org)

<a href="https://uptrace.dev/docs/js-node.html">
  <img src="https://uptrace.dev/docs/devicon/javascript-original.svg" height="200px" />
</a>

## Introduction

uptrace-js is an OpenTelemery distribution configured to export
[traces](https://uptrace.dev/opentelemetry/distributed-tracing.html) to Uptrace.

uptrace-js comes in two flavors:

- [@uptrace/node](https://uptrace.dev/docs/js-node.html) - for Node.js.
- [@uptrace/web](https://uptrace.dev/docs/js-browser.html) - for Web browsers.

## Quickstart

Install uptrace-js:

```bash
yarn add @uptrace/node --save
```

Run the [basic example](example/basic-node) below using the DSN from the Uptrace project settings
page.

```js
const otel = require('@opentelemetry/api')
const uptrace = require('@uptrace/node')

uptrace
  .configureOpentelemetry({
    // Set dsn or UPTRACE_DSN env var.
    dsn: '',
    serviceName: 'myservice',
    serviceVersion: '1.0.0',
  })
  .start()
  .then(main)

function main() {
  const tracer = otel.trace.getTracer('app_or_package_name', '1.0.0')

  const main = tracer.startSpan('main')
  otel.context.with(otel.setSpan(otel.context.active(), main), () => {
    const child1 = tracer.startSpan('child1')
    otel.context.with(otel.setSpan(otel.context.active(), child1), () => {
      child1.setAttribute('key1', 'value1')
      child1.recordException(new Error('error1'))
      child1.end()
    })

    const child2 = tracer.startSpan('child2')
    otel.context.with(otel.setSpan(otel.context.active(), child1), () => {
      child2.setAttribute('key2', 42)
      child2.end()
    })

    main.end()
    console.log(uptrace.traceUrl(main))
  })

  // Send buffered spans.
  setTimeout(async () => {
    await uptrace.shutdown()
  })
}
```

## Links

- [Examples](example)
- [Documentation](https://uptrace.dev/docs/js-node.html)
- [Instrumentations](https://uptrace.dev/opentelemetry/instrumentations/?lang=js)
