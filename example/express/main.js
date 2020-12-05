'use strict'

const uptrace = require('@uptrace/node')

if (!process.env.UPTRACE_DSN) {
  throw new Error('UPTRACE_DSN env variable is required')
}

// Run this before any other imports for auto-instrumentation to work.
const upclient = uptrace.createClient({})

const express = require('express')
const app = express()

app.get('/profiles/:username', (req, res) => {
  const username = req.params.username
  const name = selectUser(username)
  res.send(`<html><h1>Hello ${username} ${name}</h1></html>`)
})

const port = 9999

app.listen(9999, () => {
  console.log(`listening at http://localhost:${port}`)
})

function selectUser(username) {
  return withSpan('selectUser', () => _selectUser(username))
}

function _selectUser(username) {
  if (username === 'admin') {
    return 'Joe'
  }
  throw new Error(`username=${username} not found`)
}

//------------------------------------------------------------------------------

const api = require('@opentelemetry/api')

const tracer = api.trace.getTracer('express-example')

function withSpan(name, fn) {
  const span = tracer.startSpan(name, { parent: tracer.getCurrentSpan() })
  let res
  try {
    res = fn()
  } catch (err) {
    span.recordException(err)
    span.end()
    throw err
  }
  span.end()
  return res
}
