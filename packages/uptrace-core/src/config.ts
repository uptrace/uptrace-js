import { Resource, IResource } from '@opentelemetry/resources'

export interface Config {
  dsn?: string

  // `service.name` resource attribute.
  serviceName?: string
  // `service.version` resource attribute.
  serviceVersion?: string
  // `deployment.environment` resource attribute.
  deploymentEnvironment?: string
  // Any other resource attributes.
  resourceAttributes?: Record<string, any>
  // resource that describes an entity that produces telemetry, for example,
  // such attributes as host.name and service.name. All produced spans and metrics
  // will have these attributes.
  //
  // resource overrides and replaces any other resource attributes.
  resource?: IResource
}

export function createResource(
  resource: IResource | undefined,
  resourceAttributes: Record<string, any> | undefined,
  serviceName: string,
  serviceVersion: string,
  deploymentEnvironment: string,
): IResource {
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
  if (deploymentEnvironment) {
    attrs['deployment.environment'] = deploymentEnvironment
  }

  resource = Resource.default() as Resource

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

  constructor(s: string | undefined) {
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

export function parseDsn(s: string | undefined): Dsn {
  return new Dsn(s)
}
