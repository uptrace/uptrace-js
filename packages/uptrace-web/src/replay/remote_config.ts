import { Dsn } from '@uptrace/core'
import {
  EffectiveReplayConfig,
  RemoteReplayPolicy,
  SessionReplayConfig,
  SessionReplaySamplingConfig,
} from './types'
import { DEFAULT_MAX_SESSION_AGE_MS, DEFAULT_SESSION_TIMEOUT_MS } from '../session_provider'

const BUILT_IN_BLOCK_SELECTORS = ['.rr-block', '[data-rr-block]']
const BUILT_IN_MASK_SELECTORS = ['.rr-mask', '[data-rr-mask]']
let cachedPolicy: {expiresAt: number; policy: RemoteReplayPolicy} | undefined

export async function fetchReplayPolicy(dsn: Dsn, dsnHeader: string): Promise<RemoteReplayPolicy> {
  if (cachedPolicy && cachedPolicy.expiresAt > Date.now()) {
    return cachedPolicy.policy
  }

  const resp = await fetch(`${dsn.otlpHttpEndpoint()}/api/v1/session-replays/config`, {
    method: 'GET',
    credentials: 'omit',
    headers: {
      'uptrace-dsn': dsnHeader,
    },
  })
  if (!resp.ok) {
    throw new Error(`session replay config failed with ${resp.status}`)
  }

  const policy = validateRemotePolicy(await resp.json())
  cachedPolicy = {
    policy,
    expiresAt: Date.now() + policy.cache_ttl_sec * 1000,
  }
  return policy
}

export function effectiveReplayConfig(
  local: SessionReplayConfig,
  remote: RemoteReplayPolicy,
): EffectiveReplayConfig {
  const localRate = local.sampleRate ?? 1
  validateSampleRate(localRate, 'sessionReplay.sampleRate')

  return {
    enabled: local.enabled !== false && remote.enabled,
    sampleRate: Math.min(localRate, remote.sample_rate),
    allowedDomains: remote.allowed_domains.length
      ? remote.allowed_domains
      : unique(local.allowedDomains ?? []),
    blockSelectors: unique([
      ...BUILT_IN_BLOCK_SELECTORS,
      ...(remote.block_selectors ?? []),
      ...(local.blockSelectors ?? []),
      ...(local.recordIframes ? [] : ['iframe']),
    ]),
    maskSelectors: unique([
      ...BUILT_IN_MASK_SELECTORS,
      ...(remote.mask_selectors ?? []),
      ...(local.maskSelectors ?? []),
    ]),
    maskAllText: Boolean(remote.mask_all_text || local.maskAllText),
    recordIframes: Boolean(local.recordIframes),
    sampling: normalizeSampling(local.sampling),
    sessionTimeoutMs: clampSessionTimeout(local.sessionTimeoutMs),
    maxSessionAgeMs: local.maxSessionAgeMs ?? DEFAULT_MAX_SESSION_AGE_MS,
    getTraceId: local.getTraceId,
  }
}

export function domainAllowed(allowedDomains: string[], hostname: string): boolean {
  if (!allowedDomains.length) {
    return true
  }
  hostname = hostname.toLowerCase()
  return allowedDomains.some((domain) => {
    domain = domain.toLowerCase()
    if (domain.startsWith('*.')) {
      const suffix = domain.slice(1)
      return hostname.endsWith(suffix) && hostname.length > suffix.length
    }
    return hostname === domain
  })
}

function validateRemotePolicy(value: unknown): RemoteReplayPolicy {
  const policy = value as RemoteReplayPolicy
  if (!policy || policy.schema_version !== 1) {
    throw new Error('unsupported session replay policy')
  }
  validateSampleRate(policy.sample_rate, 'sample_rate')
  return {
    schema_version: 1,
    enabled: Boolean(policy.enabled),
    sample_rate: policy.sample_rate,
    allowed_domains: cleanStringArray(policy.allowed_domains),
    block_selectors: cleanStringArray(policy.block_selectors),
    mask_selectors: cleanStringArray(policy.mask_selectors),
    mask_all_text: Boolean(policy.mask_all_text),
    cache_ttl_sec: Math.max(10, Math.min(600, Number(policy.cache_ttl_sec) || 60)),
  }
}

function validateSampleRate(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be between 0 and 1`)
  }
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 50)
}

function normalizeSampling(
  sampling: SessionReplaySamplingConfig | undefined,
): Required<SessionReplaySamplingConfig> {
  const mousemoveMs = sampling?.mousemoveMs
  if (mousemoveMs === false) {
    return {
      mousemoveMs: false,
      mousemoveCallbackMs: sampling?.mousemoveCallbackMs ?? 500,
    }
  }

  const normalizedMousemove = Math.max(50, mousemoveMs ?? 50)
  if (normalizedMousemove > 1000) {
    throw new Error('sessionReplay.sampling.mousemoveMs must be <= 1000')
  }

  const callback = Math.max(normalizedMousemove, sampling?.mousemoveCallbackMs ?? 500)
  return {
    mousemoveMs: normalizedMousemove,
    mousemoveCallbackMs: callback,
  }
}

function clampSessionTimeout(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_SESSION_TIMEOUT_MS
  }
  return Math.min(value, DEFAULT_SESSION_TIMEOUT_MS)
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}
