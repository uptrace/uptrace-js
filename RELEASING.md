# Releasing Uptrace JS Packages

This guide explains how to build, test, and release the Uptrace JavaScript packages managed with
**pnpm** in a monorepo.

---

## Quick Reference

For experienced developers, here’s the release flow in short:

```sh
pnpm -r exec ncu -u        # Update dependencies
pnpm install               # Install and build
pnpm -r run build          # Build all packages

pnpm changeset             # Create changesets
git commit -am "chore: changesets"

pnpm changeset version     # Bump versions
pnpm install
git commit -am "chore: version bump"

pnpm publish -r --no-git-checks
```

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
```

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

### Step 3 – Publish to npm

Publish all updated packages:

```sh
pnpm publish -r --no-git-checks
```

**Notes:**

- Ensure you’re logged into npm: `npm whoami`.
- Run a final build check before publishing:

```sh
pnpm -r run build
```

---

## Troubleshooting

- **Workspace packages not linking?** Run `pnpm install` again at the root to refresh symlinks.

- **Changeset not creating versions?** Ensure you’ve committed all changes before
  `pnpm changeset version`.

- **Authentication issues on publish?** Log in with `npm login` and ensure you have publish rights.
