import { ContextManager, TextMapPropagator } from '@opentelemetry/api'
import { Sampler, SpanLimits, IdGenerator, RandomIdGenerator } from '@opentelemetry/sdk-trace-base'
import { Instrumentation } from '@opentelemetry/instrumentation'
import { SessionProvider } from '@opentelemetry/web-common'
import { browserDetector } from '@opentelemetry/opentelemetry-browser-detector'

import { Config as BaseConfig } from '@uptrace/core'

export function initConfig(conf: Config) {
  if (!conf.resourceDetectors) {
    conf.resourceDetectors = [browserDetector]
  }

  if (!conf.sessionProvider) {
    conf.sessionProvider = defaultSessionProvider
  }

  if (conf.entryPage === undefined) {
    // Default configuration for entry page resource.
    conf.entryPage = {
      path: true,
      hash: true,
      hostname: true,
      referrer: true,
      url: false,
      search: false,
    }
  }
}

export interface Config extends BaseConfig {
  sampler: Sampler
  spanLimits: SpanLimits
  idGenerator: IdGenerator

  contextManager?: ContextManager
  textMapPropagator?: TextMapPropagator
  instrumentations?: (Instrumentation | Instrumentation[])[]

  // Optionally provide a session provider to generate session ids for the session span processor.
  sessionProvider?: SessionProvider

  entryPage?: EntryPageConfig | false
}

// Configuration options for selecting which fields to include
// in the `entry_page` resource attributes.
//
// By default, potentially sensitive fields—such as full URLs or query parameters—are excluded.
export type EntryPageConfig = {
  // Include the URL path segment of the page.
  //
  // Example: '/products/electronics/laptops'
  // Default: true
  path?: boolean

  // Include the URL hash fragment (the part after `#`).
  //
  // Example: '#specifications'
  // Default: true
  hash?: boolean

  // Include the hostname of the current document.
  //
  // Example: 'store.example.com'
  // Default: true
  hostname?: boolean

  // Include the referrer URL (i.e., the address of the previous page).
  //
  // Example: 'https://searchengine.com/results?q=laptops'
  // Default: true
  referrer?: boolean

  // Include the full URL of the current page, including protocol, host,
  // path, query string, and hash.
  //
  // Example: 'https://store.example.com/products/electronics/laptops?page=3#specifications'
  // Note: May expose sensitive data via query strings or fragments.
  // Default: false
  url?: boolean

  // Include only the search (query string) portion of the URL.
  //
  // Example: '?page=3&sort=price'
  // Note: May include user-specific or session-specific information.
  // Default: false
  search?: boolean
}

//------------------------------------------------------------------------------

const generator = new RandomIdGenerator()
const sessionId = generator.generateTraceId()

const defaultSessionProvider = {
  getSessionId: () => sessionId,
}
