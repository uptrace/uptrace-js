import { trace, context, Span, Attributes } from '@opentelemetry/api'
import { logs, Logger, SeverityNumber } from '@opentelemetry/api-logs'
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { MeterProvider } from '@opentelemetry/sdk-metrics'
import { LoggerProvider } from '@opentelemetry/sdk-logs'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import {
  ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_STACKTRACE,
  ATTR_EXCEPTION_TYPE,
} from '@opentelemetry/semantic-conventions'

import { createResource, parseDsn, Dsn } from '@uptrace/core'
import { initConfig, Config } from './config'
import { browserAttributes, entryPageAttributes } from './resources'
import { configureTracing } from './tracing'
import { configureMetrics } from './metrics'
import { configureLogs } from './logs'
import { VERSION } from './version'

export class WebSDK {
  private _conf: Config
  private _dsn: Dsn
  private _logger: Logger

  private _tracerProvider?: WebTracerProvider
  private _meterProvider?: MeterProvider
  private _loggerProvider?: LoggerProvider

  public constructor(conf: Config) {
    initConfig(conf)
    this._conf = conf
    this._dsn = parseDsn(conf.dsn)
    this._logger = logs.getLogger('uptrace-js', VERSION)
  }

  public start(): void {
    configureResource(this._conf)
    if (this._conf.instrumentations) {
      registerInstrumentations({
        instrumentations: this._conf.instrumentations,
      })
    }

    this._tracerProvider = configureTracing(this._conf, this._dsn)
    this._meterProvider = configureMetrics(this._conf, this._dsn)
    this._loggerProvider = configureLogs(this._conf, this._dsn)
  }

  public forceFlush(): Promise<void> {
    const promises: Promise<unknown>[] = []
    if (this._tracerProvider) {
      promises.push(this._tracerProvider.forceFlush())
    }
    if (this._meterProvider) {
      promises.push(this._meterProvider.forceFlush())
    }
    if (this._loggerProvider) {
      promises.push(this._loggerProvider.forceFlush())
    }

    return (
      Promise.all(promises)
        // return void instead of the array from Promise.all
        .then(() => {})
    )
  }

  public shutdown(): Promise<void> {
    const promises: Promise<unknown>[] = []
    if (this._tracerProvider) {
      promises.push(this._tracerProvider.shutdown())
    }
    if (this._meterProvider) {
      promises.push(this._meterProvider.shutdown())
    }
    if (this._loggerProvider) {
      promises.push(this._loggerProvider.shutdown())
    }

    return (
      Promise.all(promises)
        // return void instead of the array from Promise.all
        .then(() => {})
    )
  }

  traceUrl(span: Span): string {
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
  conf.resourceAttributes = {
    ...browserAttributes(),
    ...conf.resourceAttributes,
  }
  if (conf.entryPage) {
    Object.assign(conf.resourceAttributes, entryPageAttributes(conf.entryPage))
  }
  conf.resource = createResource(conf)
}
