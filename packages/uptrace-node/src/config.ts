import { NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import { Config as BaseConfig } from '@uptrace/core'

export interface Config extends BaseConfig, Partial<Omit<NodeSDKConfiguration, 'resource'>> {}
