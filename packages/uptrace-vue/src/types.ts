export interface Vue {
  config: {
    errorHandler?: any
    warnHandler?: any
    silent?: boolean
  }
  mixin: (mixins: Mixins) => void
}

export type Mixins = Partial<Record<Hook, any>>

// TODO: use enum
export type Hook =
  | 'activated'
  | 'beforeCreate'
  | 'beforeDestroy'
  | 'beforeMount'
  | 'beforeUpdate'
  | 'created'
  | 'deactivated'
  | 'destroyed'
  | 'mounted'
  | 'updated'

export interface ViewModel {
  _isVue: boolean
  $root: ViewModel
  $parent?: ViewModel
  $props: { [key: string]: any }
  $options: {
    name?: string
    propsData?: { [key: string]: any }
    _componentTag?: string
    __file?: string
  }
}

export interface VueRouter {
  onError: (fn: (err: Error) => void) => void
  beforeEach: (fn: (to: Route, from: Route, next: () => void) => void) => void
}

export interface Route {
  params: any
  query: any
  name?: any
  path: any
  matched: any[]
}
