import { TracerProvider, Attributes } from '@opentelemetry/api'
import {
  BasicTracerProvider,
  Tracer,
  TracerConfig,
  BatchSpanProcessor,
} from '@opentelemetry/tracing'

import { Config } from './config'
import { Exporter } from './exporter'

const DUMMY_SPAN_NAME = '__dummy__'

export class Client {
  private _cfg: Config

  private _bsp: BatchSpanProcessor
  private _provider: BasicTracerProvider

  private _tracer?: Tracer

  constructor(cfg: Config) {
    this._cfg = cfg

    if (this._cfg.provider) {
      this._provider = this._cfg.provider
    } else {
      throw new Error('uptrace: config.provider is required')
    }

    const exporter = new Exporter(cfg)
    this._bsp = new BatchSpanProcessor(exporter, {
      bufferSize: 10000,
      bufferTimeout: 5 * 1000,
    })

    this._provider.addSpanProcessor(this._bsp)
    this._provider.register()
  }

  public close() {
    this._bsp.shutdown()
  }

  public getProvider(): TracerProvider {
    return this._provider
  }

  // getTracer returns a named tracer that exports span to Uptrace.
  public getTracer(name: string, version = '*', config?: TracerConfig): Tracer {
    return this._provider.getTracer(name, version, config)
  }

  // reportException reports an exception as a span event creating a dummy span if necessary.
  public reportException(err: Error | string, attrs: Attributes = {}) {
    let startedSpan = false

    const tracer = this._internalTracer()
    let span = tracer.getCurrentSpan()
    if (!span) {
      span = tracer.startSpan(DUMMY_SPAN_NAME)
      startedSpan = true
    }

    if (typeof err === 'string') {
      attrs['exception.message'] = err
    } else {
      attrs['exception.type'] = err.name
      attrs['exception.message'] = err.message
      attrs['exception.stacktrace'] = err.stack
    }

    span.addEvent('exception', attrs)

    if (startedSpan) {
      span.end()
    }
  }

  private _internalTracer(): Tracer {
    if (!this._tracer) {
      this._tracer = this.getTracer('github.com/uptrace/uptrace-js')
    }
    return this._tracer
  }
}
