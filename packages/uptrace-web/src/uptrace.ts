import { Config } from './config'
import { WebSDK } from './sdk'

export function configureOpentelemetry(conf: Config): WebSDK {
  return new WebSDK(conf)
}
