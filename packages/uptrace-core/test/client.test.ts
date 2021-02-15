import * as assert from 'assert'
import * as sinon from 'sinon'
import { BasicTracerProvider } from '@opentelemetry/tracing'

import { createClient } from '../src'

describe('time', () => {
  it('logs on empty dsn', () => {
    const spy = sinon.spy(console, 'error')

    createClient({ dsn: '', provider: new BasicTracerProvider() })

    spy.restore()
    assert.ok(spy.called)
    assert.match(spy.args[0][1], /either dsn option or UPTRACE_DSN is required/)
  })

  it('logs on invalid dsn', () => {
    const spy = sinon.spy(console, 'error')

    createClient({ dsn: 'foo bar', provider: new BasicTracerProvider() })

    spy.restore()
    assert.ok(spy.called)
    assert.match(spy.args[0][1], /can't parse DSN: "foo bar"/)
  })
})
