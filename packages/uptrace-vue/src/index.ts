import { configureOpentelemetry, shutdown, reportException, traceUrl, VERSION } from '@uptrace/web'

import { setupErrorHandler } from './vue'
import { Vue, VueRouter } from './types'

export interface Options {
  app: Vue
  router?: VueRouter
}

function instrumentVue(opts: Options) {
  setupErrorHandler(opts.app)
}

export { configureOpentelemetry, shutdown, reportException, traceUrl, VERSION, instrumentVue }

export default {
  configureOpentelemetry,
  shutdown,
  reportException,
  traceUrl,
  VERSION,

  instrumentVue,
}
