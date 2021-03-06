import { Resource } from '@opentelemetry/resources'

import type { SpanData } from './types'

export interface Config {
  dsn: string

  // `service.name` resource attribute. It is merged with resource.
  serviceName?: string
  // `service.version` resource attribute. It is merged with resource.
  serviceVersion?: string
  // Any other resource attributes. They are merged with resource.
  resourceAttributes?: Record<string, any>

  beforeSpanSend?: (span: SpanData) => void
}

export function createResource(
  otherResource: Resource | undefined,
  resourceAttributes: Record<string, any> | undefined,
  serviceName: string,
  serviceVersion: string,
): Resource {
  const attrs: Record<string, any> = {}

  if (resourceAttributes) {
    Object.assign(attrs, resourceAttributes)
  }

  if (serviceName) {
    attrs['service.name'] = serviceName
  }
  if (serviceVersion) {
    attrs['service.version'] = serviceVersion
  }

  const resource = Resource.default()
  if (otherResource) {
    resource.merge(otherResource)
  }
  if (Object.keys(attrs).length) {
    resource.merge(new Resource(attrs))
  }
  return resource
}

//------------------------------------------------------------------------------

export interface DSN {
  scheme: string
  host: string
  projectId: string
  token: string
}

export function parseDSN(s: string): DSN {
  if (!s) {
    throw new Error('either dsn option or UPTRACE_DSN is required')
  }

  let u: URL

  try {
    u = new URL(s)
  } catch (err) {
    throw new Error(`can't parse DSN=${JSON.stringify(s)}`)
  }

  const dsn = {
    scheme: u.protocol,
    host: u.host,
    projectId: u.pathname.slice(1),
    token: u.username,
  }

  if (!dsn.projectId) {
    throw new Error(`"DSN=${JSON.stringify(s)} does not have a project id`)
  }
  if (!dsn.token) {
    throw new Error(`"DSN=${JSON.stringify(s)} does not have a token`)
  }

  return dsn
}
