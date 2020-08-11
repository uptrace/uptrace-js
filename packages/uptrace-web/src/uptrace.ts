import { Attributes } from '@opentelemetry/api'
import { WebTracerProvider } from '@opentelemetry/web'
//import { ZoneContextManager } from '@opentelemetry/context-zone'
//import { DocumentLoad } from '@opentelemetry/plugin-document-load'

import { Uptrace, Config } from '@uptrace/core'

export function newUptrace(cfg: Config): Uptrace {
  if (!cfg.provider) {
    const provider = new WebTracerProvider({
      //plugins: [new DocumentLoad()],
    })
    provider.register({
      //contextManager: new ZoneContextManager(),
    })

    cfg.provider = provider
  }

  const uptrace = new Uptrace(cfg)
  setupOnError(uptrace)

  return uptrace
}

function setupOnError(uptrace: Uptrace): void {
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
        attrs['frame.file'] = file
      }
      if (line) {
        attrs['frame.line'] = line
      }
      if (column) {
        attrs['frame.column'] = column
      }
      uptrace.reportException(String(message), attrs)
    }
  }
}
