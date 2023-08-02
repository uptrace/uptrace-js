import { configureOpentelemetry, shutdown, VERSION } from '@uptrace/web'

import { setupErrorHandler } from './vue'
import { Vue, VueRouter } from './types'

export interface Options {
  app: Vue
  router?: VueRouter
}

function instrumentVue(opts: Options) {
  setupErrorHandler(opts.app)
}

export { configureOpentelemetry, shutdown, VERSION, instrumentVue }

export default {
  configureOpentelemetry,
  shutdown,
  VERSION,

  instrumentVue,
}
