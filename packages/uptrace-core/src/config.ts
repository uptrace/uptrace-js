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

  onBeforeSend?: (span: SpanData) => void
}

export function createResource(
  resource: Resource | undefined,
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

  if (!resource) {
    return new Resource(attrs)
  }
  if (!Object.keys(attrs).length) {
    return resource
  }
  return resource.merge(new Resource(attrs))
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
    throw new Error(`can't parse DSN: ${JSON.stringify(s)}`)
  }

  return {
    scheme: u.protocol,
    host: u.host,
    projectId: u.pathname.slice(1),
    token: u.username,
  }
}
