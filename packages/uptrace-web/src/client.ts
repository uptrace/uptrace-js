import { SpanAttributes } from '@opentelemetry/api'
import { WebTracerProvider, WebTracerConfig } from '@opentelemetry/web'
//import { ZoneContextManager } from '@opentelemetry/context-zone'
//import { DocumentLoad } from '@opentelemetry/plugin-document-load'

import { createClient as coreCreateClient, createResource, Config, Client } from '@uptrace/core'

const hasWindow = typeof window !== undefined

export function createClient(cfg: Partial<Config> = {}): Client {
  if (!cfg.dsn && hasWindow && (window as any).UPTRACE_DSN) {
    cfg.dsn = (window as any).UPTRACE_DSN
  }

  if (!cfg.provider) {
    const webConfig: WebTracerConfig = {
      resource: createResource(cfg),
      //plugins: [new DocumentLoad()],
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

  const client = coreCreateClient(cfg as Config)

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
      return
    }

    if (message === 'Script error.') {
      return
    }

    const attrs: SpanAttributes = {
      'window.onerror': true,
    }
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
