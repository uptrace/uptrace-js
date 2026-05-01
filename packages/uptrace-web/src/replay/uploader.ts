import { Dsn } from '@uptrace/core'
import { VERSION } from '../version'
import { ReplayBufferChunk } from './buffer'
import { ReplayChunkEnvelope } from './types'

const DEFAULT_KEEPALIVE_LIMIT_BYTES = 52 * 1024

interface UploadReplayChunkParams {
  sessionID: string
  startedAt: number
  chunkSeq: number
  chunk: ReplayBufferChunk
}

interface EncodedReplayBody {
  body: BodyInit
  byteLength: number
  compressed: boolean
}

export class SessionReplayUploader {
  constructor(
    private readonly _dsn: Dsn,
    private readonly _dsnHeader: string,
    private readonly _keepaliveLimitBytes = DEFAULT_KEEPALIVE_LIMIT_BYTES,
  ) {}

  async upload(params: UploadReplayChunkParams, keepalive = false): Promise<boolean> {
    const envelope = this.envelope(params)
    const encoded = await encodeEnvelope(envelope)

    if (keepalive && encoded.byteLength > this._keepaliveLimitBytes) {
      return false
    }

    const resp = await this.send(encoded, keepalive)
    if (resp.ok) {
      return true
    }
    if (resp.status >= 500 && !keepalive) {
      const retryResp = await this.send(encoded, false)
      return retryResp.ok
    }
    return false
  }

  private envelope(params: UploadReplayChunkParams): ReplayChunkEnvelope {
    const identity = params.chunk.identity
    return {
      protocol_version: 1,
      session_id: params.sessionID,
      started_at: new Date(params.startedAt).toISOString(),
      chunk_seq: params.chunkSeq,
      events: params.chunk.events,
      events_window: {
        first_event_at: new Date(params.chunk.firstTs).toISOString(),
        last_event_at: new Date(params.chunk.lastTs).toISOString(),
      },
      url: location.href,
      page_urls: params.chunk.pageURLs,
      trace_ids: params.chunk.traceIDs,
      user: identity,
      user_ids: identity.id ? [identity.id] : [],
      user_emails: identity.email ? [identity.email] : [],
      frontend_error_count: params.chunk.frontendErrorCount,
      metadata: {
        browser: browserName(),
        os: navigator.platform,
        sdk_version: VERSION,
      },
    }
  }

  private send(encoded: EncodedReplayBody, keepalive: boolean): Promise<Response> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'uptrace-dsn': this._dsnHeader,
    }
    if (encoded.compressed) {
      headers['content-encoding'] = 'gzip'
    }

    return fetch(`${this._dsn.otlpHttpEndpoint()}/api/v1/session-replays`, {
      method: 'POST',
      credentials: 'omit',
      keepalive,
      headers,
      body: encoded.body,
    })
  }
}

async function encodeEnvelope(envelope: ReplayChunkEnvelope): Promise<EncodedReplayBody> {
  const body = JSON.stringify(envelope)
  const compressed = await gzipString(body)
  if (compressed) {
    return {
      body: new Blob([arrayBufferFromBytes(compressed)]),
      byteLength: compressed.byteLength,
      compressed: true,
    }
  }
  return {
    body,
    byteLength: new TextEncoder().encode(body).byteLength,
    compressed: false,
  }
}

function arrayBufferFromBytes(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

async function gzipString(body: string): Promise<Uint8Array | undefined> {
  if (typeof CompressionStream === 'undefined') {
    return undefined
  }

  try {
    const stream = new CompressionStream('gzip')
    const writer = stream.writable.getWriter()
    await writer.write(new TextEncoder().encode(body))
    await writer.close()

    const reader = stream.readable.getReader()
    const chunks: Uint8Array[] = []
    let totalLength = 0
    for (;;) {
      const result = await reader.read()
      if (result.done) {
        break
      }
      chunks.push(result.value)
      totalLength += result.value.byteLength
    }

    const compressed = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      compressed.set(chunk, offset)
      offset += chunk.byteLength
    }
    return compressed
  } catch {
    return undefined
  }
}

function browserName(): string {
  const ua = navigator.userAgent
  if (ua.includes('Firefox/')) {
    return 'firefox'
  }
  if (ua.includes('Edg/')) {
    return 'edge'
  }
  if (ua.includes('Chrome/')) {
    return 'chrome'
  }
  if (ua.includes('Safari/')) {
    return 'safari'
  }
  return ''
}
