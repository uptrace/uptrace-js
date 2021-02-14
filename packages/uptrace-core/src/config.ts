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

  // `service.name` resource attribute. It is merged with resource.
  serviceName?: string
  // `service.version` resource attribute. It is merged with resource.
  serviceVersion?: string
  // Any other resource attributes. They are merged with resource.
  resourceAttributes?: Record<string, any>
  // Resource contains attributes representing an entity that produces telemetry.
  // These attributes will be copied to every span and event.
  resource?: Resource

  // Sampler is the default sampler used when creating new spans.
  sampler?: Sampler

  // Filter is the function used to filter and change span data.
  filter?: SpanFilter

  // Disables the client.
  // The default is to use UPTRACE_DISABLED environment var.
  disabled?: boolean

  // Internal fields.

  filters?: SpanFilter[]

  provider: BasicTracerProvider
}

export interface EnrichedConfig extends Config {
  dsnURL: URL
}

export function createResource(cfg: Partial<Config>): Resource {
  return _createResource(
    cfg.resource,
    cfg.resourceAttributes,
    cfg.serviceName ?? '',
    cfg.serviceVersion ?? '',
  )
}

function _createResource(
  resource: Resource | undefined,
  resourceAttributes: Record<string, any> | undefined,
  serviceName: string,
  serviceVersion: string,
): Resource {
  const attrs: Record<string, any> = {}

  if (resourceAttributes) {
    Object.assign(attrs, resourceAttributes)
  }

  if (serviceName !== '') {
    attrs['service.name'] = serviceName
  }
  if (serviceVersion !== '') {
    attrs['service.version'] = serviceVersion
  }

  if (!resource) {
    return new Resource(attrs)
  }
  if (!Object.keys(attrs).length) {
    return resource
  }
  return resource.merge(new Resource(attrs))
}
