import { repeat } from 'lodash'

import { ViewModel } from './types'

// Copied from https://github.com/vuejs/vue/blob/master/src/core/util/debug.js

const ROOT_COMPONENT_NAME = '<Root>'
const ANONYMOUS_COMPONENT_NAME = '<Anonymous>'

const classifyRE = /(?:^|[-_])(\w)/g
const classify = (str: string): string =>
  str.replace(classifyRE, (c) => c.toUpperCase()).replace(/[-_]/g, '')

export function formatComponentName(vm?: ViewModel, includeFile = false): string {
  if (!vm) {
    return ANONYMOUS_COMPONENT_NAME
  }
  if (vm.$root === vm) {
    return ROOT_COMPONENT_NAME
  }

  const options = vm.$options
  let name = options.name || options._componentTag
  const file = options.__file
  if (!name && file) {
    const match = file.match(/([^/\\]+)\.vue$/)
    if (match) {
      name = match[1]
    }
  }

  name = name ? `<${classify(name)}>` : ANONYMOUS_COMPONENT_NAME
  if (includeFile && file) {
    return name + ` at ${file}`
  }
  return name
}

export function generateComponentTrace(vm: ViewModel | undefined): string {
  if (!vm || !vm._isVue || !vm.$parent) {
    return `\n\n(found in ${formatComponentName(vm)})`
  }

  const tree = []
  let currentRecursiveSequence = 0
  while (vm) {
    if (tree.length > 0) {
      const last = tree[tree.length - 1] as any
      if (last.constructor === vm.constructor) {
        currentRecursiveSequence += 1
        vm = vm.$parent
        continue
      }
      if (currentRecursiveSequence > 0) {
        tree[tree.length - 1] = [last, currentRecursiveSequence]
        currentRecursiveSequence = 0
      }
    }
    tree.push(vm)
    vm = vm.$parent
  }

  const formattedTree = tree
    .map(
      (vm, i) =>
        `${
          (i === 0 ? '---> ' : repeat(' ', 5 + i * 2)) +
          (Array.isArray(vm)
            ? `${formatComponentName(vm[0])}... (${vm[1]} recursive calls)`
            : formatComponentName(vm))
        }`,
    )
    .join('\n')

  return `\n\nfound in\n\n${formattedTree}`
}
