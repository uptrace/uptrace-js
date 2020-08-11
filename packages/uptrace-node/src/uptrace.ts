const { NodeTracerProvider } = require('@opentelemetry/node')

import { Uptrace, Config } from '@uptrace/core'

export function newUptrace(cfg: Config): Uptrace {
  if (!cfg.provider) {
    const provider = new NodeTracerProvider()
    cfg.provider = provider
  }

  const uptrace = new Uptrace(cfg)
  return uptrace
}
