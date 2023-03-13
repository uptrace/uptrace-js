'use strict'

const uptrace = require('@uptrace/node')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg')

module.exports = (serviceName) => {
  return uptrace
    .configureOpentelemetry({
      //dsn: '',
      serviceName: serviceName,
      serviceVersion: '1.0.0',
      deploymentEnvironment: 'production',
      instrumentations: [new PgInstrumentation(), new HttpInstrumentation()],
    })
    .start()
}
