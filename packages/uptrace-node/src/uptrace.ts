import { Span, SpanAttributes } from '@opentelemetry/api'
import { BatchSpanProcessor } from '@opentelemetry/tracing'
import { NodeSDK, NodeSDKConfiguration } from '@opentelemetry/sdk-node'

import {
  createClient,
  createResource,
  parseDSN,
  DSN,
  Config as BaseConfig,
  SpanExporter,
} from '@uptrace/core'

let _CLIENT = createClient(parseDSN('https://<key>@api.uptrace.dev/<project_id>'))

export function traceUrl(span: Span): string {
  return _CLIENT.traceUrl(span)
}

export function reportException(err: Error | string, attrs: SpanAttributes = {}) {
  _CLIENT.reportException(err, attrs)
}

//------------------------------------------------------------------------------

let _SDK: NodeSDK | undefined

export interface Config extends BaseConfig, Partial<NodeSDKConfiguration> {}

export function configureOpentelemetry(cfg: Config): NodeSDK {
  configureResource(cfg)
  configureTracing(cfg)

  _SDK = new NodeSDK(cfg)
  return _SDK
}

function configureResource(cfg: Config) {
  cfg.resource = createResource(
    cfg.resource,
    cfg.resourceAttributes,
    cfg.serviceName ?? '',
    cfg.serviceVersion ?? '',
  )
}

function configureTracing(cfg: Config) {
  if (!cfg.dsn && process.env.UPTRACE_DSN) {
    cfg.dsn = process.env.UPTRACE_DSN
  }

  let dsn: DSN

  try {
    dsn = parseDSN(cfg.dsn)
  } catch (err) {
    console.error('Uptrace is disabled:', err.message ?? err)
    return
  }

  _CLIENT = createClient(dsn)

  const exporter = new SpanExporter(dsn)
  // TODO: spanProcessor is deprecated
  cfg.spanProcessor = new BatchSpanProcessor(exporter, {
    maxExportBatchSize: 1000,
    maxQueueSize: 1000,
    scheduledDelayMillis: 5 * 1000,
  })
}

export function shutdown(): Promise<void> {
  if (_SDK) {
    return _SDK.shutdown()
  }
  return Promise.resolve()
}
