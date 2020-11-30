import { Attributes } from '@opentelemetry/api'

export interface SpanData {
  id: string
  parentId: string

  name: string
  kind: number
  startTime: string
  endTime: string

  statusCode: string
  statusMessage: string
  attrs: Attributes

  events: EventData[]
  links: LinkData[]
  resource: Attributes

  tracer: TracerData
}

export interface EventData {
  name: string
  attrs: Attributes | undefined
  time: string
}

export interface LinkData {
  traceId: string
  spanId: string
  attrs: Attributes | undefined
}

export interface TracerData {
  name: string
  version: string
}

export type SpanFilter = (span: SpanData) => boolean
