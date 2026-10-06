import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core'
import { NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import {
  ALLOW_ALL_BAGGAGE_KEYS,
  BaggageSpanProcessor,
} from '@opentelemetry/baggage-span-processor'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'

import { Config as BaseConfig } from '@uptrace/core'

export interface Config extends BaseConfig, Partial<NodeSDKConfiguration> {}

export function initConfig(conf: Config) {
  conf.dsn ??= process?.env?.UPTRACE_DSN
  conf.instrumentations ??= [getNodeAutoInstrumentations()]

  conf.textMapPropagator ??= new CompositePropagator({
    propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
  })
  conf.idGenerator ??= new AWSXRayIdGenerator()

  // NodeSDK reads these arrays in its constructor and keeps references to them,
  // so processors and readers pushed in NodeSDK.start are still picked up.
  conf.spanProcessors ??= []
  conf.metricReaders ??= []
  conf.logRecordProcessors ??= []

  // Deprecated singular options are ignored by NodeSDK when the plural ones are set.
  if (conf.spanProcessor) {
    conf.spanProcessors.push(conf.spanProcessor)
    delete conf.spanProcessor
  }
  if (conf.metricReader) {
    conf.metricReaders.push(conf.metricReader)
    delete conf.metricReader
  }
  if (conf.logRecordProcessor) {
    conf.logRecordProcessors.push(conf.logRecordProcessor)
    delete conf.logRecordProcessor
  }

  conf.spanProcessors.push(new BaggageSpanProcessor(ALLOW_ALL_BAGGAGE_KEYS))
}
