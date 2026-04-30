import { configureOpentelemetry } from './uptrace'
import { VERSION } from './version'
import { flushReplay, stopReplay } from './replay/session'

export { configureOpentelemetry, VERSION }
export { flushReplay, stopReplay }
export { UserIdentity, SessionReplayConfig } from './replay/types'

export default {
  configureOpentelemetry,
  flushReplay,
  stopReplay,
  VERSION,
}
