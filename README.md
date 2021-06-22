# Uptrace for JavaScript

![build workflow](https://github.com/uptrace/uptrace-js/actions/workflows/build.yml/badge.svg)
[![Documentation](https://img.shields.io/badge/uptrace-documentation-informational)](https://docs.uptrace.dev/javascript/)

<a href="https://docs.uptrace.dev/javascript/">
  <img src="https://docs.uptrace.dev/devicon/javascript-original.svg" height="200px" />
</a>

## Introduction

uptrace-js is an OpenTelemery distribution configured to export
[traces](https://docs.uptrace.dev/tracing/#spans) to Uptrace.

uptrace-js comes in two flavors:

- [@uptrace/node](https://docs.uptrace.dev/node/) - for Node.js.
- [@uptrace/web](https://docs.uptrace.dev/javascript/) - for Web browsers.

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

For more details, please see [documentation](https://docs.uptrace.dev/node/) and
[examples](example).
