import * as assert from 'assert'
import {
  BrowserSessionProvider,
  DEFAULT_SESSION_TIMEOUT_MS,
  isUUID,
} from '../src/session_provider'

const sessionIDs = [
  '10000000-1000-4000-8000-100000000001',
  '10000000-1000-4000-8000-100000000002',
  '10000000-1000-4000-8000-100000000003',
]

describe('BrowserSessionProvider', () => {
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
      randomUUID: () => sessionIDs[nextSessionID++],
    })
    Date.now = () => now
  })

  afterEach(() => {
    restoreGlobal('localStorage', originals.localStorage)
    restoreGlobal('crypto', originals.crypto)
    Date.now = originals.dateNow as typeof Date.now
  })

  it('generates UUID sessions and stores them', () => {
    const provider = new BrowserSessionProvider({storageKey: 'session-key'})
    const session = provider.getSession()

    assert.equal(isUUID(session.id), true)
    assert.equal(session.id, sessionIDs[0])
    assert.equal(localStorage.getItem('session-key')?.includes(session.id), true)
  })

  it('reuses stored sessions across provider instances', () => {
    const first = new BrowserSessionProvider({storageKey: 'session-key'}).getSession()
    now += 1000
    const second = new BrowserSessionProvider({storageKey: 'session-key'}).getSession()

    assert.equal(second.id, first.id)
    assert.equal(second.startedAt, first.startedAt)
    assert.equal(second.lastSeenAt, now)
  })

  it('rotates sessions after inactivity timeout', () => {
    const provider = new BrowserSessionProvider({
      storageKey: 'session-key',
      sessionTimeoutMs: 1000,
    })
    const first = provider.getSession()
    now += 1001
    const second = provider.getSession()

    assert.notEqual(second.id, first.id)
    assert.equal(second.id, sessionIDs[1])
  })

  it('rotates sessions after maximum age', () => {
    const provider = new BrowserSessionProvider({
      storageKey: 'session-key',
      sessionTimeoutMs: DEFAULT_SESSION_TIMEOUT_MS,
      maxSessionAgeMs: 1000,
    })
    const first = provider.getSession()
    now += 1001
    const second = provider.getSession()

    assert.notEqual(second.id, first.id)
    assert.equal(second.id, sessionIDs[1])
  })

  it('ignores invalid stored sessions', () => {
    localStorage.setItem('session-key', '{')

    const session = new BrowserSessionProvider({storageKey: 'session-key'}).getSession()

    assert.equal(session.id, sessionIDs[0])
  })

  it('falls back to memory when localStorage is unavailable', () => {
    setGlobal('localStorage', {
      getItem() {
        throw new Error('unavailable')
      },
      setItem() {
        throw new Error('unavailable')
      },
    })
    const provider = new BrowserSessionProvider({storageKey: 'session-key'})

    const first = provider.getSession()
    const second = provider.getSession()

    assert.equal(second.id, first.id)
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
