# Changelog

## v1.10.0

- Updated OpenTelemetry to
  [v1.10.0](https://github.com/open-telemetry/opentelemetry-js/blob/main/CHANGELOG.md#180).

OpenTelemetry JS v1.10 contains a
[breaking change](https://github.com/open-telemetry/opentelemetry-js/pull/3460) in `NodeSDK` which
requires replacing the following code:

```js
const uptrace = require('@uptrace/node')

uptrace.configureOpentelemetry({...}).start().then(main)
```

With:

```js
const uptrace = require('@uptrace/node')

uptrace.configureOpentelemetry({...})
```

See [documentation](https://uptrace.dev/get/opentelemetry-js-node.html) for more details.

## v1.8.0

- Updated OpenTelemetry to
  [v1.8.0](https://github.com/open-telemetry/opentelemetry-js/blob/main/CHANGELOG.md#180).

- Enabled metrics exporter.

## v1.2.0

- Updated OpenTelemetry to
  [v1.7.0](https://github.com/open-telemetry/opentelemetry-js/blob/main/CHANGELOG.md#170).

## v1.0.1

- Updated OpenTelemetry to
  [v1.0.1](https://github.com/open-telemetry/opentelemetry-js/blob/main/CHANGELOG.md#101).

## v1.0.0

- Updated OpenTelemetry to
  [v1.0.0](https://github.com/open-telemetry/opentelemetry-js/blob/main/CHANGELOG.md#100).

## v0.25.0

- Updated OpenTelemetry to
  [v0.25.0](https://github.com/open-telemetry/opentelemetry-js/blob/main/CHANGELOG.md#0250).

## v0.19.0

- Updated OpenTelemetry to
  [v0.19.0](https://github.com/open-telemetry/opentelemetry-js/blob/main/CHANGELOG.md#0190).
