import { IdGenerator } from '@opentelemetry/core'

import { generateTraceId, generateSpanId } from '@uptrace/core'

export class UptraceIdGenerator implements IdGenerator {
  generateTraceId(): string {
    return generateTraceId(generateRandomBytes)
  }

  generateSpanId(): string {
    return generateSpanId(generateRandomBytes)
  }
}

const SHARED_BUFFER = Buffer.allocUnsafe(16)

function generateRandomBytes(bytes: number): string {
  for (let i = 0; i < bytes / 4; i++) {
    SHARED_BUFFER.writeUInt32BE((Math.random() * 2 ** 32) >>> 0, i * 4)
  }
  return SHARED_BUFFER.toString('hex', 0, bytes)
}
