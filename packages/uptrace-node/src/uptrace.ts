import { Config } from './config'
import { NodeSDK } from './sdk'

// configureOpentelemetry configures OpenTelemetry to export data to Uptrace.
export function configureOpentelemetry(conf: Config): NodeSDK {
  return new NodeSDK(conf)
}
