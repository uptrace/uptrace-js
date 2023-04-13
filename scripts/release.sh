#!/bin/bash

set -e

if ! git diff --quiet
then
    printf "working tree is not clean\n\n"
    git status
    exit 1
fi

git checkout master

pnpm bump
VERSION=$(node -pe "require('./packages/uptrace-core/package.json').version")

pnpm compile

for dir in $(ls -d example/*/); do
    pushd $dir
    sed --in-place "s/\(\"\@uptrace\/.*\": \)\"[^\"]*\"/\1\"${VERSION}\"/" ./package.json
    popd
done

git add -u
git commit -m "chore: release v${VERSION} (release.sh)"
git tag v${VERSION}
git push origin v${VERSION}

for dir in $(ls -d packages/*/); do
    pushd $dir
    pnpm publish
    popd
done
