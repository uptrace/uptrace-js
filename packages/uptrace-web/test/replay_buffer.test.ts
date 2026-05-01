import * as assert from 'assert'
import { ReplayBuffer } from '../src/replay/buffer'

describe('ReplayBuffer', () => {
  it('drains event chunks with metadata and restores failed chunks before newer events', () => {
    const buffer = new ReplayBuffer(2)
    buffer.push({timestamp: 100, type: 'first'}, 'https://example.com/one')
    buffer.push({timestamp: 200, type: 'second'}, 'https://example.com/two')

    assert.equal(buffer.isFull(), true)
    assert.deepEqual(buffer.eventWindow(), {firstTs: 100, lastTs: 200})

    const chunk = buffer.drain({
      identity: {id: 'user-1', email: 'user@example.com'},
      traceIDs: ['trace-1'],
      frontendErrorCount: 1,
    })
    assert.ok(chunk)
    assert.equal(buffer.hasEvents(), false)
    assert.equal(chunk.events.length, 2)
    assert.deepEqual(chunk.pageURLs, ['https://example.com/one', 'https://example.com/two'])
    assert.deepEqual(chunk.traceIDs, ['trace-1'])
    assert.deepEqual(chunk.identity, {id: 'user-1', email: 'user@example.com'})
    assert.equal(chunk.frontendErrorCount, 1)

    buffer.push({timestamp: 300, type: 'third'}, 'https://example.com/three')
    buffer.restore(chunk)

    const restored = buffer.drain({
      identity: {},
      traceIDs: [],
      frontendErrorCount: 0,
    })
    assert.ok(restored)
    assert.deepEqual(restored.events.map((event) => (event as {timestamp: number}).timestamp), [
      100,
      200,
      300,
    ])
    assert.deepEqual(restored.pageURLs, [
      'https://example.com/one',
      'https://example.com/two',
      'https://example.com/three',
    ])
  })
})
