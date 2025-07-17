import { DetectedResourceAttributes } from '@opentelemetry/resources'

import { EntryPageConfig } from './config'

export function browserAttributes(): DetectedResourceAttributes {
  const browserAttributes: DetectedResourceAttributes = {
    'user_agent.original': navigator.userAgent,
    'browser.touch_screen_enabled': navigator.maxTouchPoints > 0,
    'browser.language': navigator.language,
    'network.effectiveType': computeNetworkType((navigator as ExtendedNavigator).connection),
    'screen.width': window.screen.width,
    'screen.height': window.screen.height,
  }
  return browserAttributes
}

type NetworkInformationEffectiveType = 'slow-2g' | '2g' | '3g' | '4g'
type ExtendedNavigator = Navigator & {
  connection: NetworkInformation
}
type NetworkInformation = {
  effectiveType?: NetworkInformationEffectiveType
}

function computeNetworkType(networkInformation?: NetworkInformation) {
  return networkInformation?.effectiveType ?? 'unknown'
}

//------------------------------------------------------------------------------

export function entryPageAttributes(conf: EntryPageConfig): DetectedResourceAttributes {
  if (!window?.location) {
    return {}
  }

  const { href, pathname, search, hash, hostname } = window.location

  const attributes: DetectedResourceAttributes = {
    'entry_page.url': optionalAttribute(conf.url, href),
    'entry_page.path': optionalAttribute(conf.path, pathname),
    'entry_page.search': optionalAttribute(conf.search, search),
    'entry_page.hash': optionalAttribute(conf.hash, hash),
    'entry_page.hostname': optionalAttribute(conf.hostname, hostname),
    'entry_page.referrer': optionalAttribute(conf.referrer, document.referrer),
  }

  return attributes
}

function optionalAttribute<T>(shouldInclude: undefined | boolean, attribute: T): undefined | T {
  if (!shouldInclude) {
    return undefined
  }
  return attribute
}
