import { Plugins } from '@opentelemetry/node'

import { Config as BaseConfig, createResource } from '@uptrace/core'

export interface Config extends BaseConfig {
  plugins?: Plugins
}

export { createResource }
