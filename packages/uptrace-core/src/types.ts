import { SpanAttributes } from '@opentelemetry/api'

export interface SpanData {
  id: string
  parentId?: string
  traceId: string

  name: string
  kind: string
  startTime: string
  endTime: string

  statusCode: string
  statusMessage?: string

  tracerName: string
  tracerVersion?: string

  resource: SpanAttributes
  attrs: SpanAttributes

  events?: EventData[]
  links?: LinkData[]
}

export interface EventData {
  name: string
  attrs?: SpanAttributes
  time: string
}

export interface LinkData {
  traceId: string
  spanId: string
  attrs?: SpanAttributes
}

export type SpanFilter = (span: SpanData) => boolean
