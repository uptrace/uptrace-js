import * as assert from 'assert'

import { parseDsn } from '@uptrace/core'

describe('parseDsn', () => {
  it('supports app and otlp addr', () => {
    let dsn = parseDsn('https://<key>@uptrace.dev?grpc=4317')
    assert.equal(dsn.siteUrl(), 'https://app.uptrace.dev')
    assert.equal(dsn.otlpHttpEndpoint(), 'https://api.uptrace.dev')

    dsn = parseDsn('http://localhost:14318')
    assert.equal(dsn.siteUrl(), 'http://localhost:14318')
    assert.equal(dsn.otlpHttpEndpoint(), 'http://localhost:14318')
  })
})
