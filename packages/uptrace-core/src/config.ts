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

export function createConfig(_cfg: Config): EnrichedConfig {
  const cfg = _cfg as EnrichedConfig

  try {
    cfg._dsn = parseDSN(_cfg.dsn ?? '')
  } catch (err) {
    cfg.disabled = true
    console.log('Uptrace is disabled:', err.message ?? err)

    cfg._dsn = parseDSN('https://<token>@api.uptrace.dev/<project_id>')
  }

  if (!cfg.filters) {
    cfg.filters = []
  }
  if (cfg.filter) {
    cfg.filters.push(cfg.filter)
  }

  return cfg
}

export interface EnrichedConfig extends Config {
  _dsn: DSN
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

//------------------------------------------------------------------------------

interface DSN {
  scheme: string
  host: string
  projectId: string
  token: string
}

function parseDSN(s: string): DSN {
  if (!s) {
    throw new Error('uptrace: either dsn option or UPTRACE_DSN is required')
  }

  let u: URL

  try {
    u = new URL(s)
  } catch (err) {
    throw new Error(`uptrace: can't parse dsn: ${err.message}`)
  }

  return {
    scheme: u.protocol,
    host: u.host,
    projectId: u.pathname.slice(1),
    token: u.username,
  }
}
