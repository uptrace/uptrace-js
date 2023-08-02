import { configureOpentelemetry, shutdown, reportException } from './uptrace'
import { VERSION } from './version'

export { configureOpentelemetry, shutdown, reportException, VERSION }

export default {
  configureOpentelemetry,
  shutdown,
  reportException,
  VERSION,
}
