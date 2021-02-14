import * as assert from 'assert'
import * as sinon from 'sinon'
import { BasicTracerProvider } from '@opentelemetry/tracing'

import { createClient } from '../src'

describe('time', () => {
  it('throws on invalid dsn', () => {
    assert.throws(() => {
      createClient({ dsn: 'foo bar', provider: new BasicTracerProvider() })
    }, /can't parse dsn/)
  })

  it('does not throw on empty dsn', () => {
    const spy = sinon.spy(console, 'error')

    createClient({ dsn: '', provider: new BasicTracerProvider() })

    assert.ok(spy.called)
    assert.match(spy.args[0][0], /UPTRACE_DSN is empty or missing/)
  })
})
