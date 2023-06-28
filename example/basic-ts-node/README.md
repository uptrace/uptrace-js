# ts-node and Uptrace example

Install dependencies:

```shell
npm install
```

To run this example, you need to
[create an Uptrace project](https://uptrace.dev/get/get-started.html) and pass your project DSN via
`UPTRACE_DSN` env variable:

```bash
npm install
UPTRACE_DSN="https://<key>@uptrace.dev/<project_id>" npx ts-node main.ts
```
