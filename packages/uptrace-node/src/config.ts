import { Config as BaseConfig, createResource } from '@uptrace/core'

export interface Config extends BaseConfig {
  console?: boolean
}

export { createResource }
