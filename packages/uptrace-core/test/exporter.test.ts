import * as assert from 'assert'

import { Exporter } from '../src'

describe('time', () => {
  it('throws on invalid DSN', () => {
    assert.throws(() => {
      new Exporter({ dsn: '' })
    }, /dsn is required/)

    assert.throws(() => {
      new Exporter({ dsn: 'foo bar' })
    }, /can't parse dsn/)
  })
})
