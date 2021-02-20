import {
  trace,
  getSpan,
  context,
  TracerProvider,
  Tracer,
  Span,
  SpanAttributes,
} from '@opentelemetry/api'
import { BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/tracing'

import { createConfig, Config, EnrichedConfig } from './config'
import { SpanExporter } from './exporter'

const DUMMY_SPAN_NAME = '__dummy__'

export class Client {
  private _cfg: EnrichedConfig

  private _bsp: BatchSpanProcessor
  private _provider: BasicTracerProvider

  private _tracer?: Tracer

  constructor(cfg: EnrichedConfig) {
    this._cfg = cfg
    this._provider = this._cfg.provider

    const exporter = new SpanExporter(cfg)
    this._bsp = new BatchSpanProcessor(exporter, {
      maxExportBatchSize: 1000,
      maxQueueSize: 1000,
      scheduledDelayMillis: 5 * 1000,
    })

    this._provider.addSpanProcessor(this._bsp)
    this._provider.register()
  }

  public close(): Promise<void> {
    return this._bsp.shutdown()
  }

  public getTracerProvider(): TracerProvider {
    return this._provider
  }

  // reportException reports an exception as a span event creating a dummy span if necessary.
  public reportException(err: Error | string, attrs: SpanAttributes = {}) {
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
    const v = this._cfg._dsn
    const host = v.host.slice(4)
    const traceId = span.context().traceId
    return `${v.scheme}//${host}/${v.projectId}/search?q=${traceId}`
  }

  private _internalTracer(): Tracer {
    if (!this._tracer) {
      this._tracer = trace.getTracer('uptrace-js')
    }
    return this._tracer
  }
}

export function createClient(_cfg: Config): Client {
  const cfg = createConfig(_cfg)
  return new Client(cfg)
}
