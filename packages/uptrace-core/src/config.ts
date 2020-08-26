import { Sampler } from '@opentelemetry/api'
import { BasicTracerProvider } from '@opentelemetry/tracing'
import { Resource } from '@opentelemetry/resources'

import { SpanFilter } from './types'

// Config is the configuration to be used when initializing a client.
export interface Config {
  // DSN is a data source name that is used to connect to uptrace.dev.
  // Example: https://<key>@uptrace.dev/<project_id>
  // The default is to use UPTRACE_DSN environment var.
  dsn?: string

  // Resource contains attributes representing an entity that produces telemetry.
  // These attributes will be copied to every span and event.
  resource?: Resource

  // Sampler is the default sampler used when creating new spans.
  sampler?: Sampler

  // Filter is the function used to filter and change span data.
  filter?: SpanFilter

  // Disabled disables the exporter.
  // The default is to use UPTRACE_DISABLED environment var.
  disabled?: boolean

  // Internal fields.

  filters?: SpanFilter[]

  provider?: BasicTracerProvider
}
