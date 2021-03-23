import * as assert from 'assert'
import * as sinon from 'sinon'

import { configureOpentelemetry } from '../src'

describe('configureOpentelemetry', () => {
  it('logs on empty dsn', () => {
    const spy = sinon.spy(console, 'error')

    configureOpentelemetry({ dsn: '' })

    spy.restore()
    assert.ok(spy.called)
    assert.match(spy.args[0][1], /either dsn option or UPTRACE_DSN is required/)
  })

  it('logs on invalid dsn', () => {
    const spy = sinon.spy(console, 'error')

    configureOpentelemetry({ dsn: 'foo bar' })

    spy.restore()
    assert.ok(spy.called)
    assert.match(spy.args[0][1], /can't parse DSN="foo bar"/)
  })
})
