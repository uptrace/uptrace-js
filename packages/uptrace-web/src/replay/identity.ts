import { Span } from '@opentelemetry/api'
import { UserIdentity } from './types'

let currentIdentity: UserIdentity = {}

export function identify(user: UserIdentity): void {
  currentIdentity = {
    id: clean(user.id, 256),
    email: clean(user.email, 320),
  }
}

export function clearIdentity(): void {
  currentIdentity = {}
}

export function replayIdentity(): UserIdentity {
  return {...currentIdentity}
}

export function applyIdentityAttributes(span: Span): void {
  const attrs: Record<string, string> = {}
  if (currentIdentity.id) {
    attrs['enduser.id'] = currentIdentity.id
  }
  if (currentIdentity.email) {
    attrs['enduser.email'] = currentIdentity.email
  }
  if (Object.keys(attrs).length) {
    span.setAttributes(attrs)
  }
}

function clean(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return undefined
  }
  value = String(value).trim()
  if (!value) {
    return undefined
  }
  return value.slice(0, maxLength)
}
