import { Resource } from '@opentelemetry/resources'

export interface Config {
  dsn: string

  // `service.name` resource attribute.
  serviceName?: string
  // `service.version` resource attribute.
  serviceVersion?: string
  // Any other resource attributes.
  resourceAttributes?: Record<string, any>
  // resource that describes an entity that produces telemetry, for example,
  // such attributes as host.name and service.name. All produced spans and metrics
  // will have these attributes.
  //
  // resource overrides and replaces any other resource attributes.
  resource?: Resource
}

export function createResource(
  resource: Resource | undefined,
  resourceAttributes: Record<string, any> | undefined,
  serviceName: string,
  serviceVersion: string,
): Resource {
  if (resource) {
    return resource
  }

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

  resource = Resource.default()

  if (Object.keys(attrs).length) {
    return resource.merge(new Resource(attrs))
  }

  return resource
}

//------------------------------------------------------------------------------

export class Dsn {
  str = ''
  scheme = ''
  host = ''
  projectId = ''
  token = ''

  constructor(s: string) {
    if (!s) {
      throw new Error('either dsn option or UPTRACE_DSN is required')
    }

    let u: URL

    try {
      u = new URL(s)
    } catch (err) {
      throw new Error(`can't parse DSN=${JSON.stringify(s)}`)
    }

    this.str = s
    this.scheme = u.protocol
    this.host = u.host
    if (this.host === 'api.uptrace.dev') {
      this.host = 'uptrace.dev'
    }

    if (this.host !== 'uptrace.dev') {
      return
    }

    this.projectId = u.pathname.slice(1)
    this.token = u.username

    if (!this.projectId) {
      throw new Error(`"DSN=${JSON.stringify(s)} does not have a project id`)
    }
    if (!this.token) {
      throw new Error(`"DSN=${JSON.stringify(s)} does not have a token`)
    }
  }

  toString(): string {
    return this.str
  }

  appAddr(): string {
    if (this.host === 'uptrace.dev') {
      return 'https://app.uptrace.dev'
    }
    return `${this.scheme}//${this.host}`
  }

  otlpAddr(): string {
    if (this.host === 'uptrace.dev') {
      return 'https://otlp.uptrace.dev'
    }
    return `${this.scheme}//${this.host}`
  }
}

export function parseDsn(s: string): Dsn {
  return new Dsn(s)
}
