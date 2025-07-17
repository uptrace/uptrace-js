import { Span } from '@opentelemetry/api'
import { SpanProcessor } from '@opentelemetry/sdk-trace-base'

export class WindowAttributesProcessor implements SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve()
  }

  onStart(span: Span): void {
    const { href, pathname, search, hash, hostname } = window.location
    span.setAttributes({
      'browser.width': window.innerWidth,
      'browser.height': window.innerHeight,
      'page.hash': hash,
      'page.url': href,
      'page.route': pathname,
      'page.hostname': hostname,
      'page.search': search,
      'url.path': pathname,
    })
  }

  onEnd(): void {}

  shutdown(): Promise<void> {
    return Promise.resolve()
  }
}
