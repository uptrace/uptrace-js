import * as assert from 'assert'
import { BrowserSessionProvider } from '../src/session_provider'
import {
  resolveReplayBrowserSession,
  resolveReplaySessionState,
} from '../src/replay/session'

const providerSessionID = '10000000-1000-4000-8000-100000000001'
const fallbackSessionID = '10000000-1000-4000-8000-100000000002'
const rotatedSessionID = '10000000-1000-4000-8000-100000000003'

describe('session replay session binding', () => {
  const originals: Record<string, unknown> = {}
  let now = 0
  let nextSessionID = 0

  beforeEach(() => {
    originals.localStorage = (globalThis as Record<string, unknown>).localStorage
    originals.crypto = (globalThis as Record<string, unknown>).crypto
    originals.dateNow = Date.now
    now = 1000
    nextSessionID = 0
    setGlobal('localStorage', new MemoryStorage())
    setGlobal('crypto', {
      randomUUID: () => [providerSessionID, fallbackSessionID, rotatedSessionID][nextSessionID++],
    })
    Date.now = () => now
  })

  afterEach(() => {
    restoreGlobal('localStorage', originals.localStorage)
    restoreGlobal('crypto', originals.crypto)
    Date.now = originals.dateNow as typeof Date.now
  })

  it('uses UUID custom telemetry session ids for replay', () => {
    const fallback = new BrowserSessionProvider({storageKey: 'fallback-session'})
    const session = resolveReplayBrowserSession(
      {getSessionId: () => providerSessionID},
      fallback,
    )

    assert.equal(session.id, providerSessionID)
    assert.equal(session.startedAt, now)
  })

  it('preserves startedAt for restored custom telemetry sessions', () => {
    const fallback = new BrowserSessionProvider({storageKey: 'fallback-session'})
    const session = resolveReplayBrowserSession(
      {getSessionId: () => providerSessionID},
      fallback,
      {sessionID: providerSessionID, startedAt: 500},
    )

    assert.equal(session.id, providerSessionID)
    assert.equal(session.startedAt, 500)
  })

  it('falls back when custom telemetry session ids are not UUIDs', () => {
    const fallback = new BrowserSessionProvider({storageKey: 'fallback-session'})
    const session = resolveReplayBrowserSession({getSessionId: () => 'session-1'}, fallback)

    assert.equal(session.id, providerSessionID)
  })

  it('resumes replay chunk sequence for the same shared session', () => {
    const state = resolveReplaySessionState(
      {id: providerSessionID, startedAt: 1000, lastSeenAt: 1000},
      {sessionID: providerSessionID, startedAt: 1000, chunkSeq: 4},
    )

    assert.deepEqual(state, {
      sessionID: providerSessionID,
      startedAt: 1000,
      chunkSeq: 4,
    })
  })

  it('resets replay chunk sequence when the shared session rotates', () => {
    const state = resolveReplaySessionState(
      {id: rotatedSessionID, startedAt: 2000, lastSeenAt: 2000},
      {sessionID: providerSessionID, startedAt: 1000, chunkSeq: 4},
      {sessionID: providerSessionID, startedAt: 1000, chunkSeq: 5},
    )

    assert.deepEqual(state, {
      sessionID: rotatedSessionID,
      startedAt: 2000,
      chunkSeq: 0,
    })
  })
})

class MemoryStorage {
  private _items: Record<string, string> = {}

  getItem(key: string): string | null {
    return this._items[key] ?? null
  }

  setItem(key: string, value: string): void {
    this._items[key] = value
  }
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
