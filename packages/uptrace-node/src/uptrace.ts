const { NodeTracerProvider } = require('@opentelemetry/node')

import { Client, Config } from '@uptrace/core'

export function createClient(cfg: Config): Client {
  if (!cfg.provider) {
    const provider = new NodeTracerProvider()
    cfg.provider = provider
  }

  const uptrace = new Client(cfg)
  return uptrace
}
