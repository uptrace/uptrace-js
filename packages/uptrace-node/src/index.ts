import { configureOpentelemetry, shutdown } from './uptrace'
import { VERSION } from './version'

export { configureOpentelemetry, shutdown, VERSION }

export default {
  configureOpentelemetry,
  shutdown,
  VERSION,
}
