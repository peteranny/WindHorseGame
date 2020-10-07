#!/bin/sh -e

git push $@
NODE_ENV=production yarn build
git add -f dist/*
git commit -m dist -n
git subtree split --prefix dist -b gh-pages
git push -f origin gh-pages:gh-pages
git branch -D gh-pages
git reset HEAD~
rm -rf dist
