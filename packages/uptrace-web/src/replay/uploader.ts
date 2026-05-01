import { Dsn } from '@uptrace/core'
import { VERSION } from '../version'
import { ReplayBufferChunk } from './buffer'
import { ReplayChunkEnvelope } from './types'

const DEFAULT_KEEPALIVE_LIMIT_BYTES = 52 * 1024
const DEFAULT_MAX_ENVELOPE_BYTES = 10 * 1024 * 1024

interface UploadReplayChunkParams {
  sessionID: string
  startedAt: number
  chunkSeq: number
  chunk: ReplayBufferChunk
}

interface EncodedReplayBody {
  body: BodyInit
  byteLength: number
  jsonByteLength: number
  compressed: boolean
}

export class SessionReplayUploader {
  constructor(
    private readonly _dsn: Dsn,
    private readonly _dsnHeader: string,
    private readonly _keepaliveLimitBytes = DEFAULT_KEEPALIVE_LIMIT_BYTES,
    private readonly _maxEnvelopeBytes = DEFAULT_MAX_ENVELOPE_BYTES,
  ) {}

  async upload(params: UploadReplayChunkParams, keepalive = false): Promise<boolean> {
    const envelope = this.envelope(params)
    const encoded = await encodeEnvelope(envelope)

    if (encoded.jsonByteLength > this._maxEnvelopeBytes) {
      return true
    }
    if (keepalive && encoded.byteLength > this._keepaliveLimitBytes) {
      return false
    }

    const resp = await this.send(encoded, keepalive)
    if (resp.ok) {
      return true
    }
    if (resp.status === 413) {
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
      protocolVersion: 1,
      sessionId: params.sessionID,
      startedAt: new Date(params.startedAt).toISOString(),
      chunkSeq: params.chunkSeq,
      events: params.chunk.events,
      eventsWindow: {
        firstEventAt: new Date(params.chunk.firstTs).toISOString(),
        lastEventAt: new Date(params.chunk.lastTs).toISOString(),
      },
      url: location.href,
      pageUrls: params.chunk.pageURLs,
      traceIds: params.chunk.traceIDs,
      user: identity,
      userIds: identity.id ? [identity.id] : [],
      userEmails: identity.email ? [identity.email] : [],
      frontendErrorCount: params.chunk.frontendErrorCount,
      metadata: {
        browser: browserName(),
        os: navigator.platform,
        sdkVersion: VERSION,
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
  const bodyBytes = new TextEncoder().encode(body)
  const compressed = await gzipBytes(bodyBytes)
  if (compressed) {
    return {
      body: new Blob([arrayBufferFromBytes(compressed)]),
      byteLength: compressed.byteLength,
      jsonByteLength: bodyBytes.byteLength,
      compressed: true,
    }
  }
  return {
    body,
    byteLength: bodyBytes.byteLength,
    jsonByteLength: bodyBytes.byteLength,
    compressed: false,
  }
}

function arrayBufferFromBytes(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

async function gzipBytes(body: Uint8Array): Promise<Uint8Array | undefined> {
  if (typeof CompressionStream === 'undefined') {
    return undefined
  }

  try {
    const stream = new CompressionStream('gzip')
    const reader = stream.readable.getReader()
    const readPromise = readBytes(reader)

    const writer = stream.writable.getWriter()
    await writer.write(arrayBufferFromBytes(body))
    await writer.close()

    return await readPromise
  } catch {
    return undefined
  }
}

async function readBytes(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<Uint8Array> {
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

  const bytes = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
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
