import { Attributes } from '@opentelemetry/api'
import { WebTracerProvider, WebTracerConfig } from '@opentelemetry/web'
//import { ZoneContextManager } from '@opentelemetry/context-zone'
//import { DocumentLoad } from '@opentelemetry/plugin-document-load'

import { createClient as coreCreateClient, Config, Client } from '@uptrace/core'

const hasWindow = typeof window !== undefined

export function createClient(cfg: Config = {}): Client {
  if (!cfg.dsn && hasWindow && (window as any).UPTRACE_DSN) {
    cfg.dsn = (window as any).UPTRACE_DSN
  }

  if (!cfg.provider) {
    const webConfig: WebTracerConfig = {
      //plugins: [new DocumentLoad()],
    }
    if (cfg.resource) {
      webConfig.resource = cfg.resource
    }
    if (cfg.sampler) {
      webConfig.sampler = cfg.sampler
    }

    const provider = new WebTracerProvider(webConfig)
    provider.register({
      //contextManager: new ZoneContextManager(),
    })

    cfg.provider = provider
  }

  if (!cfg.filters) {
    cfg.filters = []
  }

  if (hasWindow) {
    cfg.filters.unshift((span) => {
      if (window.navigator && window.navigator.userAgent) {
        span.attrs['http.user_agent'] = String(window.navigator.userAgent)
      }
      if (window.location) {
        span.attrs['http.url'] = String(window.location)
      }
      return true
    })
  }

  const client = coreCreateClient(cfg)

  if (hasWindow) {
    setupOnError(client)
  }

  return client
}

function setupOnError(uptrace: Client): void {
  const oldHandler = window.onerror

  window.onerror = function uptraceOnerrorHandler(
    message: string | Event,
    file?: string,
    line?: number,
    column?: number,
    err?: Error,
  ) {
    if (oldHandler) {
      oldHandler(message, file, line, column, err)
    }

    if (err) {
      uptrace.reportException(err, { onerror: true })
    } else {
      const attrs: Attributes = {}
      if (file) {
        attrs['code.filepath'] = file
      }
      if (line) {
        attrs['code.lineno'] = line
      }
      if (column) {
        attrs['code.colno'] = column
      }
      uptrace.reportException(String(message), attrs)
    }
  }
}
