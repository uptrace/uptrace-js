import { BasicTracerProvider } from '@opentelemetry/tracing'

export interface Config {
  dsn: string
  disabled?: boolean

  provider?: BasicTracerProvider
}
