import { trace, context, Span, Attributes } from '@opentelemetry/api'
import { logs, Logger, SeverityNumber } from '@opentelemetry/api-logs'
import { NodeSDK as BaseNodeSDK } from '@opentelemetry/sdk-node'
import {
  ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_STACKTRACE,
  ATTR_EXCEPTION_TYPE,
} from '@opentelemetry/semantic-conventions'

import { createResource, parseDsn, Dsn, DEFAULT_DSN } from '@uptrace/core'
import { initConfig, Config } from './config'
import { configureTracing } from './tracing'
import { configureMetrics } from './metrics'
import { configureLogs } from './logs'
import { VERSION } from './version'

export class NodeSDK extends BaseNodeSDK {
  private _conf: Config
  private _dsn: Dsn
  private _logger: Logger

  public constructor(conf: Config) {
    initConfig(conf)
    super(conf)
    this._conf = conf
    this._dsn = DEFAULT_DSN
    this._logger = logs.getLogger('uptrace-js', VERSION)
  }

  public start(): void {
    this._dsn = parseDsn(this._conf.dsn)

    configureResource(this._conf)
    configureTracing(this._conf, this._dsn)
    configureMetrics(this._conf, this._dsn)
    configureLogs(this._conf, this._dsn)

    super.start()
  }

  public traceUrl(span: Span): string {
    const ctx = span.spanContext()
    const traceId = ctx?.traceId ?? '<no trace>'
    const spanId = ctx?.spanId ?? '<no span>'
    return `${this._dsn.siteUrl()}/traces/${traceId}?span_id=${spanId}`
  }

  public reportException(err: Error | string, attributes: Attributes = {}) {
    const span = trace.getSpan(context.active())
    if (span) {
      if (typeof err === 'string') {
        attributes[ATTR_EXCEPTION_MESSAGE] = err
        span.addEvent('exception', attributes)
      } else {
        span.recordException(err)
      }
      return
    }

    if (typeof err === 'string') {
      this._logger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: 'ERROR',
        body: err,
        attributes,
      })
      return
    }

    this._logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: err.message,
      attributes: {
        ...attributes,
        [ATTR_EXCEPTION_TYPE]: err.name,
        [ATTR_EXCEPTION_MESSAGE]: err.message,
        [ATTR_EXCEPTION_STACKTRACE]: err.stack,
      },
    })
  }
}

function configureResource(conf: Config) {
  conf.resource = createResource(conf)
}
