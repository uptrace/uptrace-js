# Contributing

To run the example with the local version, change `package.json`:

```
    "@uptrace/core": "link:./../../packages/uptrace-core",
    "@uptrace/node": "link:./../../packages/uptrace-node"
```

Then run:

```shell
pnpm --ignore-workspace install
```
