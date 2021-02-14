import { context, getSpan, TracerProvider, Span, Attributes } from '@opentelemetry/api'
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

    if (!this._cfg.dsn) {
      console.error(
        'uptrace: UPTRACE_DSN is empty or missing' +
          ' (to hide this message, use UPTRACE_DISABLED=True)',
      )
      this._cfg.disabled = true
    }

    const exporter = new Exporter(cfg)
    this._bsp = new BatchSpanProcessor(exporter, {
      bufferSize: 2000,
      bufferTimeout: 5 * 1000,
    })

    this._provider.addSpanProcessor(this._bsp)
    this._provider.register()
  }

  public close(): Promise<void> {
    return this._bsp.shutdown()
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
    if (this._cfg.disabled) {
      return
    }

    let startedSpan = false

    const tracer = this._internalTracer()
    let span = getSpan(context.active())

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

  public traceUrl(span: Span): string {
    const u = this._cfg.dsnURL
    const host = u.host.slice(4)
    const traceId = span.context().traceId
    return `${u.protocol}//${host}${u.pathname}/search?q=${traceId}`
  }

  private _internalTracer(): Tracer {
    if (!this._tracer) {
      this._tracer = this.getTracer('github.com/uptrace/uptrace-js')
    }
    return this._tracer
  }
}

export function createClient(cfg: Partial<Config> = {}): Client {
  if (cfg.dsn) {
    try {
      cfg.dsnURL = new URL(cfg.dsn!)
    } catch (err) {
      throw new Error(`uptrace: can't parse dsn: ${err.message}`)
    }
  }
  if (!cfg.provider) {
    throw new Error('uptrace: provider is required')
  }

  if (!cfg.filters) {
    cfg.filters = []
  }
  if (cfg.filter) {
    cfg.filters.push(cfg.filter)
  }

  return new Client(cfg as Config)
}
