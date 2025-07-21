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
  }

  init() {}

  disable(): void {
    window.removeEventListener('error', this.onError)
    window.removeEventListener('unhandledrejection', this.onError)
    this._diag.debug(`Instrumentation disabled`)
  }

  enable(): void {
    window.addEventListener('error', this.onError.bind(this))
    window.addEventListener('unhandledrejection', this.onError.bind(this))
    this._diag.debug(`Instrumentation enabled`)
  }

  private onError(event: ErrorEvent | PromiseRejectionEvent) {
    const error: Error | undefined = 'reason' in event ? event.reason : event.error
    if (error) {
      this._recordException(error)
    }
  }

  private _recordException(err: Error) {
    this.logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: err.message,
      attributes: {
        [ATTR_EXCEPTION_TYPE]: err.name,
        [ATTR_EXCEPTION_MESSAGE]: err.message,
        [ATTR_EXCEPTION_STACKTRACE]: err.stack,
      },
    })
  }
}
