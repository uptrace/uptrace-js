import { configureOpentelemetry, shutdown, reportException, traceUrl } from './uptrace'
import { VERSION } from './version'

export { configureOpentelemetry, shutdown, reportException, traceUrl, VERSION }

export default {
  configureOpentelemetry,
  shutdown,
  reportException,
  traceUrl,
  VERSION,
}
