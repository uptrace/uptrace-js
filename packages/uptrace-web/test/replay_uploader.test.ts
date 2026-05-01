import * as assert from 'assert'
import type { Dsn } from '@uptrace/core'
import { ReplayBufferChunk } from '../src/replay/buffer'
import { SessionReplayUploader } from '../src/replay/uploader'

interface RequestLog {
  input: RequestInfo | URL
  init?: RequestInit
}

const dsn = {
  otlpHttpEndpoint: () => 'https://api.example.com',
} as Dsn

const chunk: ReplayBufferChunk = {
  events: [{timestamp: 100, type: 'event'}],
  firstTs: 100,
  lastTs: 100,
  pageURLs: ['https://example.com/page'],
  traceIDs: ['trace-1'],
  identity: {id: 'user-1', email: 'user@example.com'},
  frontendErrorCount: 1,
}

describe('SessionReplayUploader', () => {
  const originals: Record<string, unknown> = {}

  beforeEach(() => {
    originals.fetch = (globalThis as Record<string, unknown>).fetch
    originals.CompressionStream = (globalThis as Record<string, unknown>).CompressionStream
    originals.location = (globalThis as Record<string, unknown>).location
    originals.navigator = (globalThis as Record<string, unknown>).navigator
    setGlobal('location', {href: 'https://example.com/page'})
    setGlobal('navigator', {
      platform: 'MacIntel',
      userAgent: 'Mozilla/5.0 Chrome/120.0 Safari/537.36',
    })
  })

  afterEach(() => {
    restoreGlobal('fetch', originals.fetch)
    restoreGlobal('CompressionStream', originals.CompressionStream)
    restoreGlobal('location', originals.location)
    restoreGlobal('navigator', originals.navigator)
  })

  it('sends gzip JSON on the existing endpoint when native compression succeeds', async () => {
    const requests: RequestLog[] = []
    setGlobal('CompressionStream', FakeCompressionStream)
    setGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      requests.push({input, init})
      return response(200)
    })

    const uploader = new SessionReplayUploader(dsn, 'dsn-value')
    const uploaded = await uploader.upload({
      sessionID: 'session-1',
      startedAt: 1000,
      chunkSeq: 2,
      chunk,
    })

    assert.equal(uploaded, true)
    assert.equal(requests.length, 1)
    assert.equal(requests[0].input, 'https://api.example.com/api/v1/session-replays')
    const headers = requests[0].init?.headers as Record<string, string>
    assert.equal(headers['uptrace-dsn'], 'dsn-value')
    assert.equal(headers['content-type'], 'application/json')
    assert.equal(headers['content-encoding'], 'gzip')
    assert.equal(requests[0].init?.body instanceof Blob, true)
  })

  it('falls back to plain JSON without a content-encoding header', async () => {
    const requests: RequestLog[] = []
    restoreGlobal('CompressionStream', undefined)
    setGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      requests.push({input, init})
      return response(200)
    })

    const uploader = new SessionReplayUploader(dsn, 'dsn-value')
    const uploaded = await uploader.upload({
      sessionID: 'session-1',
      startedAt: 1000,
      chunkSeq: 2,
      chunk,
    })

    assert.equal(uploaded, true)
    assert.equal(typeof requests[0].init?.body, 'string')
    const headers = requests[0].init?.headers as Record<string, string>
    assert.equal(headers['content-encoding'], undefined)
  })

  it('does not send oversized keepalive chunks', async () => {
    const requests: RequestLog[] = []
    restoreGlobal('CompressionStream', undefined)
    setGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      requests.push({input, init})
      return response(200)
    })

    const uploader = new SessionReplayUploader(dsn, 'dsn-value', 16)
    const uploaded = await uploader.upload(
      {
        sessionID: 'session-1',
        startedAt: 1000,
        chunkSeq: 2,
        chunk,
      },
      true,
    )

    assert.equal(uploaded, false)
    assert.equal(requests.length, 0)
  })

  it('retries non-keepalive server failures once', async () => {
    const requests: RequestLog[] = []
    restoreGlobal('CompressionStream', undefined)
    setGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      requests.push({input, init})
      return response(requests.length === 1 ? 500 : 200)
    })

    const uploader = new SessionReplayUploader(dsn, 'dsn-value')
    const uploaded = await uploader.upload({
      sessionID: 'session-1',
      startedAt: 1000,
      chunkSeq: 2,
      chunk,
    })

    assert.equal(uploaded, true)
    assert.equal(requests.length, 2)
  })
})

class FakeCompressionStream {
  readonly readable: ReadableStream<Uint8Array>
  readonly writable: WritableStream<Uint8Array>

  constructor(_format: string) {
    let controller!: ReadableStreamDefaultController<Uint8Array>
    this.readable = new ReadableStream<Uint8Array>({
      start(value) {
        controller = value
      },
    })
    this.writable = new WritableStream<Uint8Array>({
      write() {
        controller.enqueue(new Uint8Array([31, 139]))
      },
      close() {
        controller.close()
      },
    })
  }
}

function response(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
  } as Response
}

function setGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  })
}

function restoreGlobal(name: string, value: unknown): void {
  if (value === undefined) {
    delete (globalThis as Record<string, unknown>)[name]
    return
  }
  setGlobal(name, value)
}
