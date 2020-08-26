import { Plugins } from '@opentelemetry/node'

import { Config as BaseConfig } from '@uptrace/core'

export interface Config extends BaseConfig {
  plugins?: Plugins
}
