# Express instrumentation example

## Quickstart

Install [express](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/opentelemetry-instrumentation-express) instrumentation:

```bash
npm install @opentelemetry/instrumentation-http --save
npm install @opentelemetry/instrumentation-express --save
```

Then register instrumentation:

```bash
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')

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
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
  })
```

## Example

Install dependencies:

```bash
npm install
```

Start Express server:

```bash
UPTRACE_DSN="https://<key>@uptrace.dev/<project_id>" node main.js
```

Then open http://localhost:9999
