import { NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import { NodeTracerProvider } from '@opentelemetry/node'

import { Client } from '@uptrace/core'
import { Config } from './config'

export function createClient(cfg: Config): Client {
  if (!cfg.provider) {
    const nodeConfig: Partial<NodeSDKConfiguration> = {
      autoDetectResources: true,
    }
    if (cfg.resource) {
      nodeConfig.resource = cfg.resource
    }
    if (cfg.sampler) {
      nodeConfig.sampler = cfg.sampler
    }
    if (cfg.plugins) {
      nodeConfig.plugins = cfg.plugins
    }

    const provider = new NodeTracerProvider(nodeConfig)
    cfg.provider = provider
  }

  if (!cfg.filters) {
    cfg.filters = []
  }
  if (cfg.filter) {
    cfg.filters.push(cfg.filter)
  }

  const uptrace = new Client(cfg)
  return uptrace
}
