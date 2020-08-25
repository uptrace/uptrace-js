import { BasicTracerProvider } from '@opentelemetry/tracing'

import { SpanFilter } from './types'

// Config is the configuration to be used when initializing a client.
export interface Config {
  // DSN is a data source name that is used to connect to uptrace.dev.
  // Example: https://<key>@uptrace.dev/<project_id>
  // The default is to use UPTRACE_DSN environment var.
  dsn: string

  filters?: SpanFilter[]

  provider?: BasicTracerProvider

  // Disabled disables the exporter.
  // The default is to use UPTRACE_DISABLED environment var.
  disabled?: boolean
}
