#!/bin/bash

for dir in $(ls -d packages/*/); do
  pushd $dir
  npm publish
  popd
done
