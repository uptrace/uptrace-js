#!/bin/bash

set -e

if ! git diff --quiet
then
    printf "working tree is not clean\n\n"
    git status
    exit 1
fi

git checkout master

yarn bump
VERSION=$(node -pe "require('./packages/uptrace-core/package.json').version")

yarn compile
git add -u
git commit -m "Release v${VERSION} (release.sh)"
git tag v${VERSION}

for dir in $(ls -d packages/*/); do
  pushd $dir
  npm publish
  popd
done
