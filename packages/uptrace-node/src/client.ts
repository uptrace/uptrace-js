import { NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import { NodeTracerProvider } from '@opentelemetry/node'

import { createClient as coreCreateClient, Client } from '@uptrace/core'
import { Config } from './config'

export function createClient(cfg: Partial<Config> = {}): Client {
  if (!cfg.dsn && process.env.UPTRACE_DSN) {
    cfg.dsn = process.env.UPTRACE_DSN
  }

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

  const uptrace = coreCreateClient(cfg)
  return uptrace
}
