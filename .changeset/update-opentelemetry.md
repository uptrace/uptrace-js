---
'@uptrace/core': minor
'@uptrace/node': minor
'@uptrace/web': minor
---

Updated OpenTelemetry to v2.11.0 / v0.222.0.

Fixed `@uptrace/node` not exporting metrics, logs, and Uptrace resource attributes (e.g. `deployment.environment.name`), which were configured after `NodeSDK` had already read its options.
