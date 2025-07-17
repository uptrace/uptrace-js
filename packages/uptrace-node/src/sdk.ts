import { Span } from '@opentelemetry/api'
import { NodeSDK as BaseNodeSDK } from '@opentelemetry/sdk-node'

import { createResource, parseDsn, Dsn } from '@uptrace/core'
import { initConfig, Config } from './config'
import { configureTracing } from './tracing'
import { configureMetrics } from './metrics'
import { configureLogs } from './logs'

export class NodeSDK extends BaseNodeSDK {
  private _dsn: Dsn

  public constructor(conf: Config) {
    initConfig(conf)
    const dsn = parseDsn(conf.dsn)

    configureResource(conf)
    configureTracing(conf, dsn)
    configureMetrics(conf, dsn)
    configureLogs(conf, dsn)

    super(conf)
    this._dsn = parseDsn(conf.dsn)
  }

  traceUrl(span: Span): string {
    const ctx = span.spanContext()
    const traceId = ctx?.traceId ?? '<no trace>'
    const spanId = ctx?.spanId ?? '<no span>'
    return `${this._dsn.siteUrl()}/traces/${traceId}?span_id=${spanId}`
  }
}

function configureResource(conf: Config) {
  conf.resource = createResource(conf)
}
