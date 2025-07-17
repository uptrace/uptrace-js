import { Span } from '@opentelemetry/api'
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { MeterProvider } from '@opentelemetry/sdk-metrics'
import { LoggerProvider } from '@opentelemetry/sdk-logs'
import { registerInstrumentations } from '@opentelemetry/instrumentation'

import { createResource, parseDsn, Dsn } from '@uptrace/core'
import { initConfig, Config } from './config'
import { browserAttributes, entryPageAttributes } from './resources'
import { configureTracing } from './tracing'
import { configureMetrics } from './metrics'
import { configureLogs } from './logs'

export class WebSDK {
  private _conf: Config
  private _dsn: Dsn

  private _tracerProvider?: WebTracerProvider
  private _meterProvider?: MeterProvider
  private _loggerProvider?: LoggerProvider

  public constructor(conf: Config) {
    initConfig(conf)
    this._conf = conf
    this._dsn = parseDsn(conf.dsn)
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
