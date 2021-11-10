import { trace, context, Tracer, Span, SpanContext, SpanAttributes } from '@opentelemetry/api'
import { reportException } from '@uptrace/web'
import { formatComponentName, generateComponentTrace } from './util'
import { ViewModel, Vue, VueRouter, Mixins, Hook } from './types'

const hasConsole = typeof console !== 'undefined'

export function setupErrorHandler(app: Vue) {
  app.config.errorHandler = (err: Error, vm: ViewModel | undefined, lifecycleHook: string) => {
    const attributes: Record<string, any> = {
      'vue.component': formatComponentName(vm, false),
    }
    const componentTrace = generateComponentTrace(vm)

    if (vm) {
      attributes['vue.component_trace'] = componentTrace
      attributes['vue.props'] = vm.$options.propsData || vm.$props
    }
    reportException(err, attributes)

    if (hasConsole) {
      const message = `Error in ${lifecycleHook}: "${err && err.toString()}"`
      // eslint-disable-next-line no-console
      console.error(`[Vue warn]: ${message}${componentTrace}`)
    }
  }
}

export function instrumentRouter(tracer: Tracer, router: VueRouter) {
  router.beforeEach((to, from, next) => {
    const spanName =
      to.name || (to.matched.length && to.matched[0] && to.matched[0].path) || to.path

    const attributes: SpanAttributes = {
      params: to.params,
      query: to.query,
    }
    if (to.name) {
      attributes['http.route'] = to.name
    }

    const span = tracer.startSpan('__autoend__', { attributes })
    span.updateName(spanName)

    const ctx = trace.setSpan(context.active(), span)
    context.with(ctx, next)
  })

  router.onError((err) => reportException(err))
}

const HOOK_PAIRS: Record<string, [Hook, Hook]> = {
  activate: ['activated', 'deactivated'],
  mount: ['beforeMount', 'mounted'],
  update: ['beforeUpdate', 'updated'],
}

interface OtelViewModel extends ViewModel {
  readonly $root: OtelViewModel
  $_otelRootSpan?: Span
  $_spans?: Record<string, Span>
}

export function createMixins(tracer: Tracer): Mixins {
  const mixins: Mixins = {}

  for (let hookName in HOOK_PAIRS) {
    const pair = HOOK_PAIRS[hookName]
    const [before, after] = pair

    mixins[before] = function (this: OtelViewModel) {
      let parent: SpanContext | undefined

      if (this.$root.$_otelRootSpan) {
        parent = this.$root.$_otelRootSpan.spanContext()
      } else {
        parent = trace.getSpanContext(context.active())
      }

      if (!parent) {
        // Special case for initial page load, because the router's hook was not called
        // in time and the root span was not created.
        if (this.$root !== this) {
          return
        }

        this.$_otelRootSpan = tracer.startSpan('__autoend__')
        this.$_otelRootSpan.updateName('pageload')
        parent = this.$_otelRootSpan.spanContext()
      }

      const componentName = formatComponentName(this, false)
      const span = tracer.startSpan(
        `${componentName} ${hookName}`,
        {},
        trace.setSpanContext(context.active(), parent),
      )
      if (!this.$_spans) {
        this.$_spans = {}
      }
      this.$_spans[hookName] = span
    }

    mixins[after] = function (this: OtelViewModel) {
      if (!this.$_spans) {
        return
      }

      const span = this.$_spans[hookName]
      if (span) {
        span.end()
        delete this.$_spans[hookName]
      }
    }
  }

  return mixins
}
