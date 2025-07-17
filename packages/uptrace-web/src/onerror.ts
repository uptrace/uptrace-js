import { SeverityNumber } from '@opentelemetry/api-logs'
import { InstrumentationBase, InstrumentationConfig } from '@opentelemetry/instrumentation'
import {
  ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_STACKTRACE,
  ATTR_EXCEPTION_TYPE,
} from '@opentelemetry/semantic-conventions'

import { VERSION } from './version'

const instrumName = 'uptrace/onerror'

export class OnerrorInstrumentation extends InstrumentationBase {
  constructor(conf: InstrumentationConfig = {}) {
    super(instrumName, VERSION, conf)
    if (conf.enabled) {
      this.enable()
    }
  }

  init() {}

  disable(): void {
    if (!this.getConfig().enabled) {
      this._diag.debug(`Instrumentation already disabled`)
      return
    }
    this.getConfig().enabled = false
    window.removeEventListener('error', this.onError)
    window.removeEventListener('unhandledrejection', this.onError)
    this._diag.debug(`Instrumentation disabled`)
  }

  enable(): void {
    if (this.getConfig().enabled) {
      this._diag.debug(`Instrumentation already enabled`)
      return
    }
    this.getConfig().enabled = true
    window.addEventListener('error', this.onError)
    window.addEventListener('unhandledrejection', this.onError)
    this._diag.debug(`Instrumentation enabled`)
  }

  private onError(event: ErrorEvent | PromiseRejectionEvent) {
    const error: Error | undefined = 'reason' in event ? event.reason : event.error
    if (error) {
      this.recordException(error)
    }
  }

  private recordException(error: Error) {
    const message = error.message
    const type = error.name
    const attributes = {
      [ATTR_EXCEPTION_TYPE]: type,
      [ATTR_EXCEPTION_MESSAGE]: message,
      [ATTR_EXCEPTION_STACKTRACE]: error.stack,
    }

    this.logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: message,
      attributes,
    })
  }
}
