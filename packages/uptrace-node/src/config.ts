import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core'
import { NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { ALLOW_ALL_BAGGAGE_KEYS, BaggageSpanProcessor } from '@opentelemetry/baggage-span-processor'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'

import { Config as BaseConfig } from '@uptrace/core'

export interface Config extends BaseConfig, Partial<NodeSDKConfiguration> {}

export function initConfig(conf: Config) {
  conf.dsn = process?.env?.UPTRACE_DSN
  conf.instrumentations ??= [getNodeAutoInstrumentations()]

  conf.textMapPropagator ??= new CompositePropagator({
    propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
  })
  conf.idGenerator ??= new AWSXRayIdGenerator()

  conf.spanProcessors ??= []
  conf.spanProcessors.push(new BaggageSpanProcessor(ALLOW_ALL_BAGGAGE_KEYS))
}
