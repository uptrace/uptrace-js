# Releasing Uptrace JS Packages

This guide explains how to build, test, and release the Uptrace JavaScript packages managed with
**pnpm** in a monorepo.

---

## Quick Reference

For experienced developers, here’s the release flow in short:

```sh
pnpm -r exec ncu -u --filter '/^@opentelemetry\//'  # Update OpenTelemetry (see section 1)
pnpm install               # Install and build
pnpm -r run build          # Build all packages
pnpm -r test               # Run tests

pnpm changeset             # Create changesets
git commit -am "chore: changesets"

pnpm changeset version     # Bump versions
pnpm install
git commit -am "chore: version bump"
git push origin master

pnpm publish -r --no-git-checks --otp=<code>  # npm requires 2FA
```

Then verify the release (section 4, step 4) and check whether the docs need updating (section 5).

---

## 1. Updating Dependencies

To update all dependencies across every package:

```sh
pnpm -r exec ncu -u
```

- `-r` runs the command recursively for each workspace package.
- `ncu` (npm-check-updates) bumps versions in `package.json`.
- After updating, reinstall and test:

```sh
pnpm install
pnpm -r run build
pnpm -r test
```

### Updating OpenTelemetry

Most releases are OpenTelemetry updates. To bump only the `@opentelemetry/*` packages:

```sh
pnpm -r exec ncu -u --filter '/^@opentelemetry\//'
```

- OpenTelemetry JS releases two version lines together: stable packages (`2.x`, e.g. `core`,
  `resources`, `sdk-trace-base`, `sdk-metrics`) and experimental packages (`0.x`, e.g. `sdk-node`,
  `sdk-logs`, `exporter-*-otlp-http`, `instrumentation`). Keep every package in `packages/*` on the
  same pair, e.g. `~2.12.0` / `~0.223.0`.
- Packages with their own release cycle (`auto-instrumentations-node`, `id-generator-aws-xray`,
  `baggage-span-processor`, `semantic-conventions`) are updated by the same command.
- `@opentelemetry/api` stays on `1.x`.
- Update the examples that pin OpenTelemetry packages, using the same filter in each directory:

```sh
for d in example/*/; do (cd $d && npx npm-check-updates -u --filter '/^@opentelemetry\//'); done
```

- Read the [OpenTelemetry JS changelog](https://github.com/open-telemetry/opentelemetry-js/blob/main/CHANGELOG.md)
  and the [experimental changelog](https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/CHANGELOG.md)
  for deprecations and breaking changes, then build and run an example against the local packages
  (section 3).

---

## 2. Building Packages

To install dependencies and build every package:

```sh
pnpm install
```

To rebuild only (without reinstalling):

```sh
pnpm -r run build
```

> The `-r` flag runs the `build` script in all workspace packages.

---

## 3. Running Examples Locally (Without Publishing)

You can run examples using the **local packages** before publishing to npm.

1. Navigate to an example directory:

```sh
cd example/basic-node
```

2. Link the local Uptrace package in `package.json`:

```json
"dependencies": {
  "@uptrace/node": "link:../../packages/uptrace-node"
}
```

3. Install dependencies without affecting the workspace:

```sh
pnpm install --ignore-workspace
```

4. Run the example:

```sh
UPTRACE_DSN="" make
```

---

## 4. Releasing a New Version

Releases use [Changesets](https://github.com/changesets/changesets) for versioning and changelogs.

### Step 1 – Create Changesets

Document your changes and choose version bumps:

```sh
pnpm changeset
# Commit the generated changeset files
git add .
git commit -m "chore: add changesets"
```

### Step 2 – Bump Versions

Apply version changes and update lockfiles:

```sh
pnpm changeset version
pnpm install
git add .
git commit -m "chore: version bump"
```

If a version was bumped but never published, don't create another version on top of it. Update
the existing changelog entries in `packages/*/CHANGELOG.md` instead.

### Step 3 – Publish to npm

Publish all updated packages. npm requires a 2FA one-time password:

```sh
pnpm publish -r --no-git-checks --otp=<code>
```

**Notes:**

- Ensure you’re logged into npm: `npm whoami`.
- Run a final build check before publishing:

```sh
pnpm -r run build
```

### Step 4 – Verify the Release

Check that every package is published with the new version. `npm view` can return stale data for a
few minutes after publishing, so query the registry directly:

```sh
for p in core node web; do
  curl -s "https://registry.npmjs.org/@uptrace%2f$p" | node -pe \
    "d=JSON.parse(require('fs').readFileSync(0));'@uptrace/$p '+d['dist-tags'].latest"
done
```

---

## 5. Updating Documentation

After a release, check whether these docs need updating:

- This repository: `README.md` files and examples, especially `example/otlp-*`, which are
  reproduced on the Uptrace site.
- The Uptrace site (`uptrace/site` repository): `content/get/opentelemetry-js/*.md`,
  `content/guides/opentelemetry-{node-lambda,express,nestjs,nextjs}.md`, and the `@uptrace/web`
  version in `package.json`.

Look for:

- Code snippets that use APIs deprecated or removed by the new OpenTelemetry version. For example,
  OpenTelemetry 2.0 removed `new Resource()` in favor of `resourceFromAttributes()`, and `NodeSDK`
  deprecated `spanProcessor`/`metricReader`/`logRecordProcessor` in favor of the plural array
  options.
- Option descriptions that no longer match the code, e.g. `deploymentEnvironment` sets
  `deployment.environment.name`.

Run any snippet you change against the new packages.

### Updating Examples

After publishing, point the examples at the new version and check that they still run:

```sh
sed -i 's/"@uptrace\/\(node\|web\)": "[^"]*"/"@uptrace\/\1": "<version>"/' example/*/package.json
for d in example/*/; do (cd $d && rm -rf node_modules && npm install); done
```

- Commit the updated `package-lock.json` files. Make sure none of them contains `"link": true`,
  which means the lockfile was generated against the local packages instead of npm.
- Run each example with `UPTRACE_DSN` set (see each example's `README.md`). The `express-pg` and
  `redis` examples need PostgreSQL and Redis.
- `configureOpentelemetry()` returns a `NodeSDK` that the caller must `start()`; examples use
  `sdk.traceUrl()` and `sdk.shutdown()` on that instance.

---

## Troubleshooting

- **Workspace packages not linking?** Run `pnpm install` again at the root to refresh symlinks.

- **Changeset not creating versions?** Ensure you’ve committed all changes before
  `pnpm changeset version`.

- **Authentication issues on publish?** Log in with `npm login` and ensure you have publish rights.

- **`403 Forbidden ... Two-factor authentication ... is required`?** Pass a current 2FA code with
  `--otp=<code>`.

- **`403 Forbidden ... You cannot publish over the previously published versions`?** The version is
  already published. If `npm view` doesn't show it, it's a registry caching delay; see section 4,
  step 4.
