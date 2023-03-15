'use strict'

const uptrace = require('@uptrace/node')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg')

uptrace.configureOpentelemetry({
  //dsn: '',
  serviceName: 'myservice',
  serviceVersion: '1.0.0',
  deploymentEnvironment: 'production',
  instrumentations: [new PgInstrumentation(), new HttpInstrumentation()],
})
