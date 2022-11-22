type RandomBytesGenerator = (numBytes: number) => string

export function generateTraceId(generateRandomBytes: RandomBytesGenerator): string {
  const low = Math.floor(Date.now() * 1e6)
    .toString(16)
    .padEnd(16, '0')
  const high = generateRandomBytes(8)
  return low + high
}

export function generateSpanId(generateRandomBytes: RandomBytesGenerator): string {
  const low = Math.floor(Date.now() >>> 0)
    .toString(16)
    .padEnd(8, '0')
  const high = generateRandomBytes(4)
  return low + high
}
