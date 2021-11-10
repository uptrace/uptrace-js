import { hrTime } from '@opentelemetry/core'
import { HrTime } from '@opentelemetry/api'
import { SpanProcessor } from '@opentelemetry/sdk-trace-base'
import { Span as SDKSpan } from '@opentelemetry/sdk-trace-base'

const hasConsole = typeof console !== 'undefined'

interface RootInfo {
  span: SDKSpan
  timer: ReturnType<typeof setTimeout>
}

const ROOT_TIMEOUT = 5000

export class AutoEndProcessor implements SpanProcessor {
  private roots: Record<string, RootInfo>

  constructor() {
    this.roots = {}
  }

  forceFlush(): Promise<void> {
    return Promise.resolve()
  }

  onStart(span: SDKSpan): void {
    if (!span.name || !shouldAutoEnd(span)) {
      return
    }

    const ctx = span.spanContext()
    const root = this.roots[ctx.traceId]

    if (root) {
      // We should not have duplicated roots.
      if (hasConsole) {
        console.error(`root ${ctx.traceId} already exists`)
      }
      return
    }

    const timer = setTimeout(() => this.endRoot(ctx.traceId), ROOT_TIMEOUT)
    this.roots[ctx.traceId] = {
      span,
      timer,
    }
  }

  onEnd(span: SDKSpan): void {
    if (!span.name || shouldAutoEnd(span)) {
      return
    }

    const ctx = span.spanContext()
    const rootInfo = this.roots[ctx.traceId]
    if (!rootInfo) {
      return
    }

    // Remember the time and debounce in case new child spans are created.
    const endTime = hrTime()
    if (rootInfo.timer) {
      clearTimeout(rootInfo.timer)
    }
    rootInfo.timer = setTimeout(() => this.endRoot(ctx.traceId, endTime), ROOT_TIMEOUT)
  }

  shutdown(): Promise<void> {
    for (let traceId in this.roots) {
      const root = this.roots[traceId]
      root.span.end()
      clearTimeout(root.timer)
    }
    this.roots = {}

    return Promise.resolve()
  }

  private endRoot(traceId: string, endTime?: HrTime) {
    const root = this.roots[traceId]
    if (root) {
      root.span.end(endTime)
      delete this.roots[traceId]
    }
  }
}

function shouldAutoEnd(span: SDKSpan): boolean {
  return span.name === '__autoend__'
}
