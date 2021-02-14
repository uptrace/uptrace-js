import { NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import { NodeTracerProvider } from '@opentelemetry/node'

import { createClient as baseCreateClient, Client } from '@uptrace/core'
import { Config, createResource } from './config'

export function createClient(cfg: Partial<Config> = {}): Client {
  if (!cfg.dsn && process.env.UPTRACE_DSN) {
    cfg.dsn = process.env.UPTRACE_DSN
  }

  if (!cfg.provider) {
    const nodeConfig: Partial<NodeSDKConfiguration> = {
      resource: createResource(cfg),
      autoDetectResources: true,
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

  const uptrace = baseCreateClient(cfg as Config)
  return uptrace
}
