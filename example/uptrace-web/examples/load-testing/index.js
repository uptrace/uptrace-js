const {
  context,
  trace,
  metrics,
  DiagConsoleLogger,
  DiagLogLevel,
  diag,
} = require('@opentelemetry/api')
const { logs, SeverityNumber } = require('@opentelemetry/api-logs')
const { resourceFromAttributes } = require('@opentelemetry/resources')
const {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} = require('@opentelemetry/semantic-conventions')

// Trace
const { WebTracerProvider } = require('@opentelemetry/sdk-trace-web')
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')

// Metrics
const {
  MeterProvider,
  PeriodicExportingMetricReader,
} = require('@opentelemetry/sdk-metrics')
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http')

// Logs
const { LoggerProvider, BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs')
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http')

// Enable diagnostic logging for debugging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)

// Parse UPTRACE_DSN to extract endpoint
function parseDsn(dsn) {
  const url = new URL(dsn)
  return `${url.protocol}//${url.host}`
}

const otlpEndpoint = parseDsn(process.env.UPTRACE_DSN)
const headers = { 'uptrace-dsn': process.env.UPTRACE_DSN }

// Create shared resource
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'load-testing-web',
  [ATTR_SERVICE_VERSION]: '1.0.0',
})

// Configure Trace Provider
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
  headers,
})

const tracerProvider = new WebTracerProvider({
  resource,
  spanProcessors: [
    new BatchSpanProcessor(traceExporter, {
      maxExportBatchSize: 512,
    }),
  ],
})
tracerProvider.register()

// Configure Meter Provider
const metricExporter = new OTLPMetricExporter({
  url: `${otlpEndpoint}/v1/metrics`,
  headers,
})

const meterProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 5000,
    }),
  ],
})
metrics.setGlobalMeterProvider(meterProvider)

// Configure Logger Provider
const logExporter = new OTLPLogExporter({
  url: `${otlpEndpoint}/v1/logs`,
  headers,
})

const loggerProvider = new LoggerProvider({
  resource,
  processors: [
    new BatchLogRecordProcessor(logExporter, {
      maxExportBatchSize: 500,
    }),
  ],
})
logs.setGlobalLoggerProvider(loggerProvider)

const tracer = trace.getTracer('load-testing', '1.0.0')
const meter = metrics.getMeter('load-testing', '1.0.0')
const logger = logs.getLogger('load-testing', '1.0.0')

// Metrics
const requestCounter = meter.createCounter('load_test.requests', {
  description: 'Total number of generated requests',
})

const requestDuration = meter.createHistogram('load_test.request_duration', {
  description: 'Duration of generated requests in ms',
  unit: 'ms',
})

const activeSpansGauge = meter.createUpDownCounter('load_test.active_spans', {
  description: 'Number of currently active spans',
})

const errorCounter = meter.createCounter('load_test.errors', {
  description: 'Total number of simulated errors',
})

// Configuration (can be updated via UI)
const config = {
  minInterval: 100, // minimum ms between spans
  maxInterval: 1000, // maximum ms between spans
  batchSize: 1, // number of spans to generate per interval
}

// State
let isRunning = false
let intervalId = null
let spanCount = 0
let activeSpans = 0

const endpoints = [
  '/api/users',
  '/api/products',
  '/api/orders',
  '/api/checkout',
  '/api/inventory',
  '/api/payments',
  '/api/notifications',
  '/api/analytics',
]

const httpMethods = ['GET', 'POST', 'PUT', 'DELETE']

const statusCodes = [200, 200, 200, 200, 201, 204, 400, 404, 500]

const logMessages = [
  'Processing request',
  'Request completed successfully',
  'Cache hit',
  'Cache miss - fetching from database',
  'Database query executed',
  'User authenticated',
  'Session validated',
  'Rate limit check passed',
  'Webhook triggered',
  'Background job queued',
]

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDuration() {
  return Math.floor(Math.random() * 500) + 50
}

function emitLog(message, severityNumber, attributes = {}) {
  logger.emit({
    severityNumber,
    severityText: getSeverityText(severityNumber),
    body: message,
    attributes: {
      'log.source': 'load-testing',
      ...attributes,
    },
  })
}

function getSeverityText(severityNumber) {
  if (severityNumber <= SeverityNumber.DEBUG) return 'DEBUG'
  if (severityNumber <= SeverityNumber.INFO) return 'INFO'
  if (severityNumber <= SeverityNumber.WARN) return 'WARN'
  return 'ERROR'
}

function generateSpan() {
  const endpoint = randomElement(endpoints)
  const method = randomElement(httpMethods)
  const statusCode = randomElement(statusCodes)
  const duration = randomDuration()
  const isError = statusCode >= 400

  spanCount++
  activeSpans++
  activeSpansGauge.add(1)

  const span = tracer.startSpan(`${method} ${endpoint}`, {
    attributes: {
      'http.method': method,
      'http.url': `https://example.com${endpoint}`,
      'http.route': endpoint,
      'http.status_code': statusCode,
      'span.number': spanCount,
    },
  })

  // Record metrics
  requestCounter.add(1, {
    method,
    endpoint,
    status_code: statusCode.toString(),
  })

  // Emit start log
  emitLog(`Starting ${method} ${endpoint}`, SeverityNumber.INFO, {
    'http.method': method,
    'http.url': endpoint,
    'span.id': spanCount,
  })

  context.with(trace.setSpan(context.active(), span), () => {
    // Add random events to the span
    const numEvents = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < numEvents; i++) {
      span.addEvent(randomElement(logMessages), {
        'event.index': i,
        'timestamp.relative': `${Math.floor((duration * (i + 1)) / (numEvents + 1))}ms`,
      })
    }

    // Simulate nested spans occasionally
    if (Math.random() > 0.7) {
      const childSpan = tracer.startSpan('database.query', {
        attributes: {
          'db.system': 'postgresql',
          'db.operation': 'SELECT',
          'db.name': 'mydb',
        },
      })

      setTimeout(() => {
        childSpan.addEvent('Query executed', {
          'db.rows_affected': Math.floor(Math.random() * 100),
        })
        childSpan.end()
      }, duration / 2)
    }

    // End the span after simulated duration
    setTimeout(() => {
      if (isError) {
        span.setStatus({ code: 2, message: `HTTP ${statusCode} Error` })
        errorCounter.add(1, { status_code: statusCode.toString(), endpoint })
        emitLog(
          `Error: ${method} ${endpoint} returned ${statusCode}`,
          SeverityNumber.ERROR,
          {
            'http.method': method,
            'http.url': endpoint,
            'http.status_code': statusCode,
            error: true,
          },
        )
      } else {
        span.setStatus({ code: 1 })
        emitLog(`Completed ${method} ${endpoint} in ${duration}ms`, SeverityNumber.INFO, {
          'http.method': method,
          'http.url': endpoint,
          duration_ms: duration,
        })
      }

      requestDuration.record(duration, {
        method,
        endpoint,
        status_code: statusCode.toString(),
      })

      span.end()
      activeSpans--
      activeSpansGauge.add(-1)

      console.log(
        `[Span #${spanCount}] ${method} ${endpoint} -> ${statusCode} (${duration}ms)`,
      )

      if (spanCount % 10 === 0) {
        const spanContext = span.spanContext()
        console.log(`Trace ID: ${spanContext.traceId}`)
      }
    }, duration)
  })
}

function startLoadTest() {
  if (isRunning) {
    console.log('Load test already running')
    return
  }

  isRunning = true
  spanCount = 0
  activeSpans = 0

  emitLog('Load test started', SeverityNumber.INFO, {
    'test.action': 'start',
  })

  console.log('Starting continuous load test...')
  updateUI()

  // Generate spans at random intervals
  function scheduleNext() {
    if (!isRunning) return

    // Generate batch of spans
    for (let i = 0; i < config.batchSize; i++) {
      generateSpan()
    }

    // Random interval between min and max
    const range = config.maxInterval - config.minInterval
    const nextInterval = Math.floor(Math.random() * range) + config.minInterval
    intervalId = setTimeout(scheduleNext, nextInterval)
  }

  scheduleNext()
}

function updateConfig() {
  const minInterval = parseInt(document.getElementById('minInterval')?.value, 10)
  const maxInterval = parseInt(document.getElementById('maxInterval')?.value, 10)
  const batchSize = parseInt(document.getElementById('batchSize')?.value, 10)

  if (!isNaN(minInterval) && minInterval >= 10) config.minInterval = minInterval
  if (!isNaN(maxInterval) && maxInterval >= config.minInterval)
    config.maxInterval = maxInterval
  if (!isNaN(batchSize) && batchSize >= 1) config.batchSize = batchSize

  console.log(
    `Config updated: interval=${config.minInterval}-${config.maxInterval}ms, batch=${config.batchSize}`,
  )
}

function stopLoadTest() {
  if (!isRunning) {
    console.log('Load test not running')
    return
  }

  isRunning = false
  if (intervalId) {
    clearTimeout(intervalId)
    intervalId = null
  }

  emitLog('Load test stopped', SeverityNumber.INFO, {
    'test.action': 'stop',
    'total.spans': spanCount,
  })

  console.log(`Load test stopped. Total spans generated: ${spanCount}`)
  updateUI()
}

function updateUI() {
  const startBtn = document.getElementById('startBtn')
  const stopBtn = document.getElementById('stopBtn')
  const statusEl = document.getElementById('status')
  const counterEl = document.getElementById('counter')

  if (startBtn) startBtn.disabled = isRunning
  if (stopBtn) stopBtn.disabled = !isRunning
  if (statusEl) statusEl.textContent = isRunning ? 'Running' : 'Stopped'
  if (counterEl) counterEl.textContent = spanCount
}

function updateCounter() {
  const counterEl = document.getElementById('counter')
  const activeEl = document.getElementById('activeSpans')
  if (counterEl) counterEl.textContent = spanCount
  if (activeEl) activeEl.textContent = activeSpans
}

window.addEventListener('load', () => {
  document.getElementById('startBtn').addEventListener('click', startLoadTest)
  document.getElementById('stopBtn').addEventListener('click', stopLoadTest)

  // Config input listeners
  const configInputs = ['minInterval', 'maxInterval', 'batchSize']
  configInputs.forEach((id) => {
    const el = document.getElementById(id)
    if (el) {
      el.addEventListener('change', updateConfig)
      el.addEventListener('input', updateConfig)
    }
  })

  // Initialize UI with default config values
  const minIntervalEl = document.getElementById('minInterval')
  const maxIntervalEl = document.getElementById('maxInterval')
  const batchSizeEl = document.getElementById('batchSize')
  if (minIntervalEl) minIntervalEl.value = config.minInterval
  if (maxIntervalEl) maxIntervalEl.value = config.maxInterval
  if (batchSizeEl) batchSizeEl.value = config.batchSize

  // Update counter display periodically
  setInterval(updateCounter, 500)

  console.log('Load testing example ready')
  console.log('Click "Start" to begin generating spans, metrics, and logs')
})
