import {
  defaultResource,
  detectResources,
  resourceFromAttributes,
  Resource,
  ResourceDetector,
  DetectedResourceAttributes,
} from '@opentelemetry/resources'

export interface Config {
  dsn?: string

  // resource that describes an entity that produces telemetry, for example,
  // such attributes as host.name and service.name. All produced spans and metrics
  // will have these attributes.
  resource?: Resource
  // `service.name` resource attribute.
  serviceName?: string
  // `service.version` resource attribute.
  serviceVersion?: string
  // `deployment.environment` resource attribute.
  deploymentEnvironment?: string
  // Any other resource attributes.
  resourceAttributes?: Record<string, any>
  // Optional resource detectors.
  resourceDetectors?: ResourceDetector[]
}

export function createResource(conf: Config): Resource {
  let resource = defaultResource()
  if (conf.resource) {
    resource = resource.merge(conf.resource)
  }

  if (conf.resourceDetectors) {
    resource = resource.merge(
      detectResources({
        detectors: conf.resourceDetectors,
      }),
    )
  }

  const attrs: DetectedResourceAttributes = {}

  if (conf.resourceAttributes) {
    Object.assign(attrs, conf.resourceAttributes)
  }
  if (conf.serviceName) {
    attrs['service.name'] = conf.serviceName
  }
  if (conf.serviceVersion) {
    attrs['service.version'] = conf.serviceVersion
  }
  if (conf.deploymentEnvironment) {
    attrs['deployment.environment.name'] = conf.deploymentEnvironment
  }

  if (Object.keys(attrs).length) {
    resource = resource.merge(resourceFromAttributes(attrs))
  }

  return resource
}

//------------------------------------------------------------------------------

export class Dsn {
  str = ''
  scheme = ''
  host = ''

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
  }

  toString(): string {
    return this.str
  }

  siteUrl(): string {
    if (this.host === 'uptrace.dev') {
      return 'https://app.uptrace.dev'
    }
    return `${this.scheme}//${this.host}`
  }

  otlpHttpEndpoint(): string {
    if (this.host === 'uptrace.dev') {
      return 'https://api.uptrace.dev'
    }
    return `${this.scheme}//${this.host}`
  }
}

export function parseDsn(s: string | undefined): Dsn {
  return new Dsn(s)
}

export const DEFAULT_DSN = parseDsn('https://api.uptrace.dev?grpc=4317')
