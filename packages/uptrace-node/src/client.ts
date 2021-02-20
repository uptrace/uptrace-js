import { NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import { NodeTracerProvider } from '@opentelemetry/node'
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/tracing'

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

    const provider = new NodeTracerProvider(nodeConfig)
    cfg.provider = provider

    if (cfg.console) {
      provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))
    }
  }

  const uptrace = baseCreateClient(cfg as Config)
  return uptrace
}
