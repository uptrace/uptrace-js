import { Span, Attributes } from '@opentelemetry/api'
import { NodeSDK, NodeSDKConfiguration } from '@opentelemetry/sdk-node'

import { createClient, createResource, parseDsn, Dsn } from '@uptrace/core'
import { initConfig, Config } from './config'
import { configureTracing } from './tracing'
import { configureMetrics } from './metrics'
import { configureLogs } from './logs'

let _CLIENT = createClient(parseDsn('https://<key>@uptrace.dev/<project_id>'))

export function reportException(err: Error | string, attrs: Attributes = {}) {
  _CLIENT.reportException(err, attrs)
}

export function traceUrl(span: Span): string {
  return _CLIENT.traceUrl(span)
}

//------------------------------------------------------------------------------

let _SDK: NodeSDK | undefined

// configureOpentelemetry configures OpenTelemetry to export data to Uptrace.
// By default it:
//   - creates tracer provider;
//   - registers Uptrace span exporter;
//   - sets tracecontext + baggage composite context propagator.
export function configureOpentelemetry(conf: Config): NodeSDK {
  if (!conf.dsn && process.env.UPTRACE_DSN) {
    conf.dsn = process.env.UPTRACE_DSN
  }

  let dsn: Dsn

  try {
    dsn = parseDsn(conf.dsn)
    _CLIENT = createClient(dsn)

    initConfig(conf)
    configureResource(conf)
    configureTracing(conf, dsn)
    configureMetrics(conf, dsn)
    configureLogs(conf, dsn)
  } catch (err) {
    console.error('Uptrace is disabled:', String(err))
  }

  _SDK = new NodeSDK(conf as NodeSDKConfiguration)
  _SDK.start()

  return _SDK
}

function configureResource(conf: Config) {
  conf.resource = createResource(conf)
}

export function shutdown(): Promise<void> {
  if (_SDK) {
    return _SDK.shutdown()
  }
  return Promise.resolve()
}
