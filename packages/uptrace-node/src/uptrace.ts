import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core'
import { Span, SpanAttributes } from '@opentelemetry/api'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSDK, NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
//import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'

import { PeriodicExportingMetricReader, AggregationTemporality } from '@opentelemetry/sdk-metrics'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'

import { createClient, createResource, parseDsn, Dsn, Config as BaseConfig } from '@uptrace/core'

let _CLIENT = createClient(parseDsn('https://<key>@uptrace.dev/<project_id>'))

export function reportException(err: Error | string, attrs: SpanAttributes = {}) {
  _CLIENT.reportException(err, attrs)
}

export function traceUrl(span: Span): string {
  return _CLIENT.traceUrl(span)
}

//------------------------------------------------------------------------------

let _SDK: NodeSDK | undefined

export interface Config extends BaseConfig, Partial<NodeSDKConfiguration> {}

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

    configureResource(conf)
    configurePropagator(conf)
    configureTracing(conf, dsn)
    configureMetrics(conf, dsn)
  } catch (err) {
    console.error('Uptrace is disabled:', String(err))
  }

  _SDK = new NodeSDK(conf)
  return _SDK
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

function configureTracing(conf: Config, dsn: Dsn) {
  _CLIENT = createClient(dsn)

  const exporter = new OTLPTraceExporter({
    url: `${dsn.otlpAddr()}/v1/traces`,
    headers: { 'uptrace-dsn': conf.dsn },
  })
  conf.spanProcessor = new BatchSpanProcessor(exporter, {
    maxExportBatchSize: 1000,
    maxQueueSize: 1000,
    scheduledDelayMillis: 5 * 1000,
  })
  //conf.idGenerator = new AWSXRayIdGenerator()

  conf.instrumentations ??= [getNodeAutoInstrumentations()]
}

function configureMetrics(conf: Config, dsn: Dsn) {
  conf.metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${dsn.otlpAddr()}/v1/metrics`,
      headers: { 'uptrace-dsn': conf.dsn },
      temporalityPreference: AggregationTemporality.DELTA,
    }),
    exportIntervalMillis: 15000,
  })
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
