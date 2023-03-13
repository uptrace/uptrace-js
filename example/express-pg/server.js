'use strict'

// eslint-disable-next-line import/order
require('./tracer')('postgres-server-service').then(main)
const otel = require('@opentelemetry/api')
const { SpanKind, SpanStatusCode } = require('@opentelemetry/api')
const { Pool } = require('pg')
const express = require('express')

const tracer = otel.trace.getTracer('example-postgres')

function main() {
  const pool = startPsql()
  const app = express()

  app.get('/:cmd', (req, res) => {
    const cmd = req.path.slice(1)
    if (!req.query.id) {
      res.status(400).send('No id provided')
      return
    }
    let queryText = `SELECT id, text FROM test WHERE id = ${req.query.id}`
    if (cmd === 'insert') {
      if (!req.query.text) {
        res.status(400).send('No text provided')
        return
      }
      queryText = {
        text: 'INSERT INTO test (id, text) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET text=$2',
        values: [req.query.id, req.query.text],
      }
    }

    const currentSpan = otel.trace.getSpan(otel.context.active())
    console.log(`traceid: ${currentSpan.spanContext().traceId}`)

    tracer.startActiveSpan(
      cmd,
      {
        kind: SpanKind.SERVER,
      },
      (span) => {
        try {
          pool.query(queryText, (err, ret) => {
            if (err) throw err
            res.send(ret.rows)
          })
        } catch (e) {
          res.status(400).send({ message: e.message })
          span.setStatus(SpanStatusCode.ERROR)
        }
        span.end()
      },
    )
  })

  // start server
  const port = 3123
  app.listen(port, () => {
    console.log(`Node HTTP listening on ${port}`)
  })
}

function startPsql() {
  const pool = new Pool({
    password: process.env.POSTGRES_USER || 'postgres',
    user: process.env.POSTGRES_USER || 'postgres',
    database: process.env.POSTGRES_DB || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 54320,
  })

  pool.connect((connectErr, client, release) => {
    if (connectErr) throw connectErr
    release()
    const queryText =
      'CREATE TABLE IF NOT EXISTS test(id SERIAL PRIMARY KEY, text VARCHAR(40) not null)'
    client.query(queryText, (err, res) => {
      if (err) throw err
      console.log(res.rows[0])
    })
  })

  return pool
}
