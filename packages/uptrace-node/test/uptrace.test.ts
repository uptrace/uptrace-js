import * as assert from 'assert'
import * as sinon from 'sinon'

import { parseDsn } from '@uptrace/core'
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

describe('configureOpentelemetry', () => {
  it('supports app and otlp addr', () => {
    let dsn = parseDsn('https://<key>@uptrace.dev/<project_id>')
    assert.equal(dsn.siteUrl(), 'https://app.uptrace.dev')
    assert.equal(dsn.otlpHttpEndpoint(), 'https://otlp.uptrace.dev')

    dsn = parseDsn('http://localhost:14318')
    assert.equal(dsn.siteUrl(), 'http://localhost:14318')
    assert.equal(dsn.otlpHttpEndpoint(), 'http://localhost:14318')
  })
})
