# Using OTLP exporter with Uptrace

This example shows how to configure
[OTLP](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-exporter-collector)
to export traces to Uptrace.

Install dependencies:

```shell
npm install
```

To run this example, you need to
[create an Uptrace project](https://uptrace.dev/get/get-started.html) and pass your project DSN via
`UPTRACE_DSN` env variable:

```go
UPTRACE_DSN=https://<token>@api.uptrace.dev/<project_id> node main.js
```
