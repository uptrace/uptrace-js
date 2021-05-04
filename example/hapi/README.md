# Hapi instrumentation example

## Quickstart

Install [hapi](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/opentelemetry-instrumentation-hapi) instrumentation:

```bash
npm install @opentelemetry/instrumentation-http --save
npm install @opentelemetry/instrumentation-hapi --save
```

Then register instrumentation:

```bash
const { HapiInstrumentation } = require('@opentelemetry/instrumentation-hapi');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

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
    instrumentations: [new HttpInstrumentation(), new HapiInstrumentation()],
  })
```

## Example

Install dependencies:

```bash
npm install
```

Start Hapi server:

```bash
UPTRACE_DSN="https://<key>@uptrace.dev/<project_id>" node main.js
```

Then open http://localhost:9999
