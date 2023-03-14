# Express.js + pg example for OpenTelemetry

Start PostgreSQL server with docker:

```shell
npm run docker:start
```

Install dependencies:

```shell
npm install
```

Start Express.js server:

```shell
UPTRACE_DSN="https://<key>@uptrace.dev/<project_id>" node --require ./tracing.js server.js
```

Start HTTP client:

```shell
UPTRACE_DSN="https://<key>@uptrace.dev/<project_id>" node --require ./tracing.js client.js
```

Both the server and the client will log a trace id which you can use in Uptrace UI to find the
trace.

Once done, stop PostgreSQL:

```shell
npm run docker:stop
```
