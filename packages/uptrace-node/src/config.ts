import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core'
import { NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'

import { Config as BaseConfig } from '@uptrace/core'

export interface Config extends BaseConfig, Partial<NodeSDKConfiguration> {}

export function initConfig(conf: Config) {
  if (!conf.dsn && process.env.UPTRACE_DSN) {
    conf.dsn = process.env.UPTRACE_DSN
  }
  conf.instrumentations ??= [getNodeAutoInstrumentations()]
  conf.spanProcessors ??= []
  conf.textMapPropagator ??= new CompositePropagator({
    propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
  })
  conf.idGenerator ??= new AWSXRayIdGenerator()
}
