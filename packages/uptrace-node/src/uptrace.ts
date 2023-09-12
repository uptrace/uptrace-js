import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core'
import { Span, SpanAttributes } from '@opentelemetry/api'
import { NodeSDK, NodeSDKConfiguration } from '@opentelemetry/sdk-node'

import { createClient, createResource, parseDsn, Dsn } from '@uptrace/core'
import type { Config } from './config'
import { configureTracing } from './tracing'
import { configureMetrics } from './metrics'
import { configureLogs } from './logs'

let _CLIENT = createClient(parseDsn('https://<key>@uptrace.dev/<project_id>'))

export function reportException(err: Error | string, attrs: SpanAttributes = {}) {
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
export function configureOpentelemetry(conf: Config) {
  if (!conf.dsn && process.env.UPTRACE_DSN) {
    conf.dsn = process.env.UPTRACE_DSN
  }

  let dsn: Dsn

  try {
    dsn = parseDsn(conf.dsn)
    _CLIENT = createClient(dsn)

    configureResource(conf)
    configurePropagator(conf)
    configureTracing(conf, dsn)
    configureMetrics(conf, dsn)
    configureLogs(conf, dsn)
  } catch (err) {
    console.error('Uptrace is disabled:', String(err))
  }

  _SDK = new NodeSDK(conf as NodeSDKConfiguration)
  _SDK.start()
}

function configureResource(conf: Config) {
  conf.resource = createResource(
    conf.resource,
    conf.resourceAttributes,
    conf.serviceName ?? '',
    conf.serviceVersion ?? '',
    conf.deploymentEnvironment ?? '',
  )
}

function configurePropagator(conf: Config) {
  if (!conf.textMapPropagator) {
    conf.textMapPropagator = new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    })
  }
}

export function shutdown(): Promise<void> {
  if (_SDK) {
    return _SDK.shutdown()
  }
  return Promise.resolve()
}
